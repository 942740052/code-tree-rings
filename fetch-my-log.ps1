# 从 GitHub API 生成与 `git log --numstat` 格式一致的数据
# PowerShell 负责网络（走本地代理），Node 负责格式化
$ErrorActionPreference = 'Stop'
$p = 'http://127.0.0.1:7897'

$out = ("protocol=https`nhost=github.com`n`n" | git credential fill 2>&1)
$tok = (($out -split "`n") | Where-Object { $_ -match '^password=(.*)$' } | ForEach-Object { $Matches[1] })
if (-not $tok) { throw '未找到凭证' }
$H = @{ 'Authorization' = "token $tok"; 'User-Agent' = 'dsh'; 'Accept' = 'application/vnd.github+json' }

# git 判定为二进制的扩展名
$BIN = '\.(jpg|jpeg|png|gif|webp|bmp|ico|mp4|mov|avi|pdf|zip|jar|woff2?|ttf|eot|so|dll|exe|bin)$'

$commits = @(
  @{ sha = '3479f26'; full = '3479f26' },
  @{ sha = '8824db3'; full = '8824db3' },
  @{ sha = 'c46fbbc'; full = 'c46fbbc' }
)

$lines = New-Object System.Collections.Generic.List[string]

foreach ($c in $commits) {
  $api = "https://api.github.com/repos/942740052/Photo-collection/commits/$($c.full)"
  $j = (Invoke-WebRequest $api -Proxy $p -UseBasicParsing -TimeoutSec 60 -Headers $H).Content | ConvertFrom-Json

  # GitHub 返回 UTC，转成本地时区（Asia/Shanghai）
  $d = ([datetime]::Parse($j.commit.author.date)).ToLocalTime()
  $local = $d.ToString('yyyy-MM-dd HH:mm:ss')
  $author = $j.commit.author.name
  $subject = ($j.commit.message -split "`n")[0].Trim()

  $lines.Add("$($c.sha)|$local|$author|$subject")

  foreach ($f in $j.files) {
    $isBin = $f.filename -match $BIN
    if ($isBin) {
      $lines.Add("-$([char]9)-$([char]9)$($f.filename)")
    } else {
      $lines.Add("$($f.additions)$([char]9)$($f.deletions)$([char]9)$($f.filename)")
    }
  }
}

$text = ($lines -join "`n") + "`n"
[System.IO.File]::WriteAllText('D:\trae-active\my-gitlog.txt', $text, (New-Object System.Text.UTF8Encoding($false)))
"已生成 my-gitlog.txt"
"提交数: $($commits.Count)"
"行数  : $($lines.Count)"
