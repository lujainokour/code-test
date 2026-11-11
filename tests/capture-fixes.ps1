$ErrorActionPreference='Stop'
$profile=Join-Path $env:TEMP ('cm-visual-fixes-'+[guid]::NewGuid().ToString('N'))
$chrome=Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--no-first-run','--remote-debugging-port=0',('--user-data-dir='+$profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket=$null
try {
 $portFile=Join-Path $profile 'DevToolsActivePort'
 for($attempt=0;$attempt -lt 100 -and !(Test-Path $portFile);$attempt++){Start-Sleep -Milliseconds 100}
 $port=(Get-Content $portFile)[0];$targets=Invoke-RestMethod "http://127.0.0.1:$port/json";$target=$targets|Where-Object {$_.type -eq 'page'}|Select-Object -First 1
 $socket=New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'));$script:sequence=0
 function Cdp($method,$parameters){$script:sequence++;$id=$script:sequence;$socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 10 -Compress));do{$response=$socket.Receive()|ConvertFrom-Json}while($response.id -ne $id);if($response.error){throw ($response.error|ConvertTo-Json)};return $response.result}
 function Eval($expression){$result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true};if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 5)};return $result.result.value}
 Cdp 'Runtime.enable' @{}|Out-Null
 Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})}|Out-Null
 $root=Split-Path $PSScriptRoot;$shots=Join-Path $root 'previews/fixes-2026-11-08';New-Item -ItemType Directory -Path $shots -Force|Out-Null;$results=@()
 foreach($width in @(1366,390)){
  Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=900;deviceScaleFactor=1;mobile=$false}|Out-Null
  foreach($route in @('index.html','pages/student/learning-path.html','pages/student/subscription.html','pages/services/peer-mentoring.html','pages/teacher/teacher-bookings.html')){
   $url='http://127.0.0.1:8765/'+$route;$literal=ConvertTo-Json -InputObject $url -Compress
   Cdp 'Page.navigate' @{url=$url}|Out-Null
   for($probe=0;$probe -lt 100;$probe++){Start-Sleep -Milliseconds 100;if(Eval ("document.readyState==='complete'&&location.href==="+$literal)){break}}
   Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});true"|Out-Null
   $metrics=Eval "({overflow:document.documentElement.scrollWidth>innerWidth+1,title:document.querySelector('main h1')?.textContent,theme:document.documentElement.dataset.theme})"
   $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false};$name=([IO.Path]::GetFileNameWithoutExtension($route))+'-'+$width+'.png'
   [IO.File]::WriteAllBytes((Join-Path $shots $name),[Convert]::FromBase64String($shot.data));$results+=@{route=$route;width=$width;metrics=$metrics;screenshot=('previews/fixes-2026-11-08/'+$name)}
  }
 }
 $preserved=@();foreach($file in @('index.html','css/style.css','css/user-guide.css')){$a=(Get-FileHash -LiteralPath (Join-Path $root $file) -Algorithm SHA256).Hash;$b=(Get-FileHash -LiteralPath (Join-Path $root ('.local-backups/fixes-2026-11-08/'+$file)) -Algorithm SHA256).Hash;$preserved+=@{file=$file;unchanged=($a -eq $b);sha256=$a}}
 @{screenshots=$results;preserved=$preserved}|ConvertTo-Json -Depth 10|Set-Content -Encoding UTF8 (Join-Path $root 'docs/fixes-2026-11-08-design-results.json')
 if(@($results|Where-Object {$_.metrics.overflow}).Count -or @($preserved|Where-Object {!$_.unchanged}).Count){throw 'Design preservation check failed.'}
 Write-Output 'Captured 10 desktop/mobile screenshots; no horizontal overflow; homepage and both stylesheets are byte-identical.'
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force}}
