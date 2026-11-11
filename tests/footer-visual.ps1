$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-services-input-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
$socket = New-Object System.Net.WebSockets.ClientWebSocket
try {
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $script:sequence=0
    function Cdp($method,$parameters) {
        $script:sequence++; $id=$script:sequence
        $bytes=[Text.Encoding]::UTF8.GetBytes((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        $socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
        do {
            $stream=New-Object IO.MemoryStream
            do { $buffer=New-Object byte[] 65536; $part=$socket.ReceiveAsync([ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult(); $stream.Write($buffer,0,$part.Count) } while (!$part.EndOfMessage)
            $response=[Text.Encoding]::UTF8.GetString($stream.ToArray())|ConvertFrom-Json; $stream.Dispose()
        } while ($response.id -ne $id)
        if ($response.error) {throw ($response.error|ConvertTo-Json)}
        return $response.result
    }
    function Eval($expression) { $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}; if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}; return $result.result.value }
    $checks=@();$metrics=@()
    function Check($name,$passed){$script:checks+=@{name=$name;passed=[bool]$passed}}
    foreach($width in @(1366,768,390,320)) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=900;deviceScaleFactor=1;mobile=$false}|Out-Null
        Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/index.html#contact'}|Out-Null
        Start-Sleep -Milliseconds 700
        Eval "codeMentorTheme.set('light');true"|Out-Null
        Eval "window.f=document.getElementById('contact');window.inner=f.querySelector('.footer-inner');window.cs=n=>getComputedStyle(n);f.scrollIntoView({behavior:'instant'});true"|Out-Null
        $m=Eval @"
(()=>{const r=f.getBoundingClientRect();return{width:innerWidth,clientWidth:document.documentElement.clientWidth,height:r.height,left:r.left,right:r.right,columns:cs(inner).gridTemplateColumns.split(' ').length,bg:cs(f).backgroundColor,logoFilter:cs(f.querySelector('img')).filter,logoBg:cs(f.querySelector('img')).backgroundColor,logoLink:new URL(f.querySelector('.brand-logo').href).pathname,year:document.getElementById('year').textContent,overflow:document.documentElement.scrollWidth>innerWidth}})()
"@
        $metrics+=@{width=$width;metrics=$m}
        Check ($width.ToString()+': burgundy full-width background, no overflow') ($m.bg -eq 'rgb(38, 2, 4)' -and $m.left -eq 0 -and [Math]::Abs($m.right-$m.clientWidth) -lt 1 -and !$m.overflow)
        Check ($width.ToString()+': correct columns') ($m.columns -eq $(if($width -gt 700){3}else{1}))
        Check ($width.ToString()+': original logo without filter on light backing') ($m.logoFilter -eq 'none' -and $m.logoBg -eq 'rgb(218, 234, 240)' -and $m.logoLink -eq '/index.html')
        Check ($width.ToString()+': year behavior retained') ($m.year -eq (Get-Date).Year.ToString())
        Check ($width.ToString()+': footer content readable, no clipped rows') (Eval "[...f.querySelectorAll('a')].every(a=>{const r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height>=40})")
        if($width -eq 1366 -or $width -eq 390){
            Eval "new Promise(resolve=>{document.documentElement.style.scrollBehavior='auto';scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});setTimeout(resolve,450)})"|Out-Null
            $clip=Eval "(()=>{const r=f.getBoundingClientRect();return{x:0,y:r.top+scrollY,width:innerWidth,clientWidth:document.documentElement.clientWidth,height:r.height,scale:1}})()"
            $shot=if($width -eq 390){Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}}else{Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true;clip=$clip}}
            $name=if($width -eq 1366){'footer-desktop.png'}else{'footer-mobile.png'}
            [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path ('previews/'+$name)),[Convert]::FromBase64String($shot.data))
        }
    }
    Check 'Existing LinkedIn GitHub and phone destinations preserved' (Eval "[...f.querySelectorAll('address a')].map(a=>a.getAttribute('href')).join('|')==='https://www.linkedin.com/in/lujain-okour-06903b313/?isSelfProfile=true|https://github.com/lujainokour|https://wa.me/qr/OLHW7VLAKBJ4M1'")
    Check 'External links safely open in new tab' (Eval "[...f.querySelectorAll('address a[target]')].length===3&&[...f.querySelectorAll('address a[target]')].every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer'))")
    Check 'Explore list includes all seven working local destinations after teacher portal retirement' (Eval "f.querySelectorAll('.footer-links li').length===7&&[...f.querySelectorAll('.footer-links a')].every(a=>a.hash?document.querySelector(a.hash):['/pages/auth/login.html','/pages/auth/company-login.html'].includes(new URL(a.href).pathname))")
    Check 'Contact icons decorative and labels accessible' (Eval "f.querySelectorAll('svg[aria-hidden=true]').length===3&&[...f.querySelectorAll('address a')].every(a=>a.textContent.trim().length>=5&&(!a.href.includes('wa.me')||a.getAttribute('aria-label').includes('WhatsApp')))")
    $contrast=Eval @"
(()=>{function l(c){const v=c.match(/[\d.]+/g).slice(0,3).map(x=>{x=+x/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]}const bg=l(cs(f).backgroundColor);const nodes=[...f.querySelectorAll('h2,p,a,.footer-contact-label,.brand-ai')];return Math.min(...nodes.map(n=>{const fg=l(cs(n).color);return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)}))})()
"@
    Check 'All footer text colors meet 4.5:1 contrast' ($contrast -ge 4.5)
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1366;height=900;deviceScaleFactor=1;mobile=$false}|Out-Null
    Eval "f.querySelector('.brand-logo').focus();true"|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Tab';code='Tab';windowsVirtualKeyCode=9}|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Tab';code='Tab';windowsVirtualKeyCode=9}|Out-Null
    Start-Sleep -Milliseconds 200
    Check 'Actual Tab reaches Explore link with visible outline' (Eval "document.activeElement===f.querySelector('.footer-links a')&&cs(document.activeElement).outlineStyle==='solid'&&cs(document.activeElement).outlineWidth==='2px'")
    $p=Eval "(()=>{const a=f.querySelector('.footer-links a');const r=a.getBoundingClientRect();return{x:r.x+5,y:r.y+r.height/2}})()"
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=$p.x;y=$p.y}|Out-Null
    Start-Sleep -Milliseconds 200
    Check 'Hover/focus provides short link movement' (Eval "cs(f.querySelector('.footer-links a')).transform.includes('3, 0')")
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})}|Out-Null
    Check 'Reduced motion preserves outline without movement' (Eval "cs(f.querySelector('.footer-links a')).transform==='none'&&cs(document.activeElement).outlineWidth==='2px'")
    Eval "f.querySelector('.footer-bottom a').click();true"|Out-Null
    Start-Sleep -Milliseconds 1200
    Check 'Back to top keeps original main anchor and scrolls up' (Eval "location.hash==='#main'&&scrollY<150")
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Footer Learner',email:'footer@example.com',role:'student',isDemo:true}));true" | Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/pages/student/dashboard.html'}|Out-Null
    Start-Sleep -Milliseconds 350
    Check 'Dashboard footer remains separate' (Eval "!document.getElementById('contact')&&getComputedStyle(document.querySelector('.workspace-footer')).backgroundColor!=='rgb(38, 2, 4)'")
    $result=@{passed=@($checks|Where-Object {$_.passed}).Count;total=$checks.Count;checks=$checks;contrastMinimum=$contrast;metrics=$metrics}
    $result|ConvertTo-Json -Depth 10|Set-Content docs/footer-visual-results.json -Encoding UTF8
    Write-Output ($result.passed.ToString()+'/'+$result.total+'; minimum contrast '+$contrast)
    $checks|Where-Object {!$_.passed}|ForEach-Object {Write-Output $_.name}
    $metrics|ForEach-Object {Write-Output ($_.width.ToString()+': height '+$_.metrics.height+' columns '+$_.metrics.columns)}
}finally{$socket.Dispose();if(!$chrome.HasExited){Stop-Process -Id $chrome.Id}}


