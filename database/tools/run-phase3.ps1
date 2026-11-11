param([string]$Server='lpc:.',[string]$DatabaseName='CodeMentorAI_Phase3_Test_20261105_R3',[switch]$Install)
$ErrorActionPreference='Stop'
$taskTools=if($PSScriptRoot){$PSScriptRoot}else{Join-Path (Get-Location) 'database/tools'}
$taskRoot=Split-Path $taskTools -Parent
if($DatabaseName -notmatch '^CodeMentorAI_Phase3_') { throw 'Only distinct Phase 3 database names are allowed.' }
function Connect-Phase3([string]$name) {
 $b=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
 $b['Data Source']=$Server; $b['Initial Catalog']=$name; $b['Integrated Security']=$true; $b['Encrypt']=$false; $b['TrustServerCertificate']=$true
 $c=New-Object System.Data.SqlClient.SqlConnection($b.ConnectionString); $c.Open(); return $c
}
function Write-JsonFile($name,$value) { [IO.File]::WriteAllText((Join-Path $taskRoot "reports/$name"),($value | ConvertTo-Json -Depth 40),[Text.UTF8Encoding]::new($false)) }
if($Install) {
 $c=Connect-Phase3 'master'
 try {
  $cmd=$c.CreateCommand(); $cmd.CommandTimeout=120
  $cmd.CommandText='SELECT DB_ID(@target)'; [void]$cmd.Parameters.AddWithValue('@target',$DatabaseName)
  if($cmd.ExecuteScalar() -isnot [DBNull]) { throw 'Target exists. Choose another unused name; no cleanup is performed.' }
  $sql=[IO.File]::ReadAllText((Join-Path $taskRoot 'submission.sql'))
  if(-not $sql.Contains("DECLARE @DatabaseName sysname = N'$DatabaseName';")){throw 'Submission target must exactly match the requested target.'}
  $cmd.Parameters.Clear(); $cmd.CommandText=$sql; [void]$cmd.ExecuteNonQuery()
 } finally {$c.Dispose()}
}
$c=Connect-Phase3 $DatabaseName
try {
 $cmd=$c.CreateCommand(); $cmd.CommandTimeout=120
 $cmd.CommandText=[IO.File]::ReadAllText((Join-Path $taskTools 'metadata.sql'))
 $reader=$cmd.ExecuteReader(); $builder=New-Object Text.StringBuilder
 while($reader.Read()){[void]$builder.Append($reader.GetString(0))};$reader.Close()
 [IO.File]::WriteAllText((Join-Path $taskRoot 'reports/schema-metadata.json'),$builder.ToString(),[Text.UTF8Encoding]::new($false))
 $cmd.CommandText=[IO.File]::ReadAllText((Join-Path $taskRoot 'verification.sql'))
 $adapter=New-Object System.Data.SqlClient.SqlDataAdapter($cmd); $data=New-Object System.Data.DataSet
 $failure=$null
 try {[void]$adapter.Fill($data)}catch{$failure=$_.Exception.Message}
 $sets=@(); foreach($table in $data.Tables) {
  $rows=@(); foreach($row in $table.Rows){$obj=[ordered]@{};foreach($column in $table.Columns){$obj[$column.ColumnName]=if($row[$column] -is [DBNull]){$null}else{$row[$column]}};$rows+=,$obj};$sets+=,@($rows)
 }
 Write-JsonFile 'sql-verification.json' ([ordered]@{database=$DatabaseName;executedAtUtc=[DateTime]::UtcNow.ToString('o');realSqlExecution=$true;failure=$failure;resultSets=$sets})
 if($failure){throw $failure}
 foreach($table in $data.Tables) {
  if($table.Columns.Contains('FailedChecks')) {
   foreach($row in $table.Rows) { if([int]$row['FailedChecks'] -gt 0){throw 'SQL verification returned failed checks. Review reports/sql-verification.json.'} }
  }
 }
 Write-Output "SQL verification completed in $DatabaseName; see reports/sql-verification.json"
}finally{$c.Dispose()}
