param([string]$Server='lpc:.',[string]$DatabaseName='CodeMentorAI_Phase3_Test_20261105_R3')
$ErrorActionPreference='Stop'
$taskTools=if($PSScriptRoot){$PSScriptRoot}else{Join-Path (Get-Location) 'database/tools'}
$taskRoot=Split-Path $taskTools -Parent
function Open-TestConnection([string]$name){
 $b=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
 $b['Data Source']=$Server;$b['Initial Catalog']=$name;$b['Integrated Security']=$true;$b['Encrypt']=$false;$b['TrustServerCertificate']=$true
 $c=New-Object System.Data.SqlClient.SqlConnection($b.ConnectionString);$c.Open();return $c
}
function Fingerprint-Database([string]$name){
 $c=Open-TestConnection $name
 try{
  $cmd=$c.CreateCommand();$cmd.CommandTimeout=60
  # No definitions/data leave SQL Server, only SHA-256 digests and object names.
  $cmd.CommandText="SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT o.name,o.type,o.modify_date,m.definition FROM sys.objects o LEFT JOIN sys.sql_modules m ON m.object_id=o.object_id WHERE o.is_ms_shipped=0 ORDER BY o.name,o.type FOR JSON PATH,INCLUDE_NULL_VALUES)),2)";
  $objects=$cmd.ExecuteScalar()
  $cmd.CommandText="SELECT SCHEMA_NAME(schema_id)+'.'+name FROM sys.tables WHERE is_ms_shipped=0 ORDER BY name";
  $reader=$cmd.ExecuteReader();$names=@();while($reader.Read()){$names+=,$reader.GetString(0)};$reader.Close()
  $rows=[ordered]@{}
  foreach($table in $names){
   if($table -notmatch '^\w+\.\w+$'){throw 'Unexpected identifier in preservation fingerprint'}
   $cmd.CommandText="SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT * FROM $table ORDER BY (SELECT NULL) FOR JSON PATH,INCLUDE_NULL_VALUES)),2)"
   $rows[$table]=$cmd.ExecuteScalar()
  }
  return [ordered]@{database=$name;objectsSha256=$objects;tableDataSha256=$rows}
 }finally{$c.Dispose()}
}
$originalBefore=Fingerprint-Database 'CodeMentorAI_Learning'
$testBefore=Fingerprint-Database $DatabaseName
$results=@()
$c=Open-TestConnection $DatabaseName
try {
 $cmd=$c.CreateCommand();$cmd.CommandTimeout=90
 $cmd.CommandText=[IO.File]::ReadAllText((Join-Path $taskRoot 'academic-examples.sql'))
 [void]$cmd.ExecuteNonQuery()
 $results+=,[ordered]@{name='All academic SQL examples executed including four JOIN types and disposable DDL';passed=$true}
 $cmd.CommandText='DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS, NO_INFOMSGS;'
 $violation=$cmd.ExecuteScalar()
 $results+=,[ordered]@{name='DBCC CHECKCONSTRAINTS reports no violations';passed=($null -eq $violation)}
}finally{$c.Dispose()}
$script=[IO.File]::ReadAllText((Join-Path $taskRoot 'submission.sql'))
foreach($case in @(@{Name='Existing target rejected without mutation';Sql=$script;Expected=51001},@{Name='Original database target forbidden';Sql=$script.Replace("DECLARE @DatabaseName sysname = N'$DatabaseName';","DECLARE @DatabaseName sysname = N'CodeMentorAI_Learning';");Expected=51000})){
 $c=Open-TestConnection 'master';$actual=$null
 try{$cmd=$c.CreateCommand();$cmd.CommandText=$case.Sql;[void]$cmd.ExecuteNonQuery()}catch{$actual=$_.Exception.InnerException.Number}finally{$c.Dispose()}
 $results+=,[ordered]@{name=$case.Name;passed=($actual -eq $case.Expected);expectedError=$case.Expected;actualError=$actual}
}
$concurrent=@(
 @{Name='Assessment publication lock serializes grading-key changes';Lock='SELECT AssessmentId FROM dbo.Assessments WITH(UPDLOCK,HOLDLOCK) WHERE AssessmentId=1';Write="UPDATE dbo.QuestionOptions SET OptionText=N'changed concurrently' WHERE QuestionId=1";Expected=51117},
 @{Name='Submission lock serializes result insertion';Lock='SELECT SubmissionId FROM dbo.CodeSubmissions WITH(UPDLOCK,HOLDLOCK) WHERE SubmissionId=2';Write="INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT 2,TestCaseId,TaskId,0,N'wrong','Success' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=2";Expected=51142},
 @{Name='Role lock serializes admin-profile rejection';Lock='SELECT UserId FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=1';Write="INSERT dbo.StudentProfiles(UserId,PreferredLanguageId,ExperienceCode,LearningGoalCode) VALUES(1,1,'Beginner','Foundations')";Expected=51101}
)
foreach($case in $concurrent){
 $a=Open-TestConnection $DatabaseName;$b=Open-TestConnection $DatabaseName
 $ta=$a.BeginTransaction();$tb=$b.BeginTransaction();$actual=$null;$blocked=$false
 try{
  $lock=$a.CreateCommand();$lock.Transaction=$ta;$lock.CommandText=$case.Lock;[void]$lock.ExecuteScalar()
  $write=$b.CreateCommand();$write.Transaction=$tb;$write.CommandText=$case.Write;$write.CommandTimeout=15
  $pending=$write.BeginExecuteNonQuery();$blocked=-not $pending.AsyncWaitHandle.WaitOne(500)
  $ta.Rollback();$ta=$null
  try{[void]$write.EndExecuteNonQuery($pending)}catch{$actual=$_.Exception.InnerException.Number}
 }finally{
  if($ta){try{$ta.Rollback()}catch{}}
  try{$tb.Rollback()}catch{}
  $a.Dispose();$b.Dispose()
 }
 $results+=,[ordered]@{name=$case.Name;passed=($blocked -and $actual -eq $case.Expected);blockedUntilParentReleased=$blocked;expectedError=$case.Expected;actualError=$actual}
}
$originalAfter=Fingerprint-Database 'CodeMentorAI_Learning'
$testAfter=Fingerprint-Database $DatabaseName
$originalEqual=($originalBefore|ConvertTo-Json -Depth 20 -Compress) -eq ($originalAfter|ConvertTo-Json -Depth 20 -Compress)
$testEqual=($testBefore|ConvertTo-Json -Depth 20 -Compress) -eq ($testAfter|ConvertTo-Json -Depth 20 -Compress)
$results+=,[ordered]@{name='Original schema/modules and table rows unchanged during safety checks';passed=$originalEqual}
$results+=,[ordered]@{name='Test schema/modules and table rows unchanged during safety/concurrency checks';passed=$testEqual}
$failed=@($results|Where-Object {-not $_.passed}).Count
$report=[ordered]@{executedAtUtc=[DateTime]::UtcNow.ToString('o');passed=$results.Count-$failed;failed=$failed;results=$results;originalBefore=$originalBefore;originalAfter=$originalAfter;testBefore=$testBefore;testAfter=$testAfter;scope='Hash comparison covers this safety/concurrency run; original database was not an implementation/design source. No original database writes were issued.'}
[IO.File]::WriteAllText((Join-Path $taskRoot 'reports/safety-concurrency.json'),($report|ConvertTo-Json -Depth 30),[Text.UTF8Encoding]::new($false))
if($failed){throw "$failed safety/concurrency checks failed"}
Write-Output "$($results.Count) safety/concurrency checks passed"
