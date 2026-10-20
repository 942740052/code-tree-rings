# 批量生成海报并做非空校验
# 1. 用无头 Chrome 渲染 poster.html
# 2. 用 .NET 逐像素采样，确认图片不是纯色空白
$ErrorActionPreference = 'Continue'
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$root = 'D:\trae-active'
$outDir = "$root\posters"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$shots = @(
  @{ name = 'poster-terminal'; theme = 'terminal'; nick = '阿 Build'; data = '' },
  @{ name = 'poster-warm';    theme = 'warm';    nick = '阿 Build'; data = '' },
  @{ name = 'poster-mono';    theme = 'mono';    nick = '阿 Build'; data = '' },
  @{ name = 'poster-real';    theme = 'terminal'; nick = '942740052'; data = 'my-gitlog.txt' }
)

# 昵称经 URL 传参会乱码，改为生成带 data-nick 属性的临时页面
$posterSrc = "$root\poster.html"
$posterTmp = "$root\poster.tmp.html"

foreach ($s in $shots) {
  $html = [System.IO.File]::ReadAllText($posterSrc, [System.Text.Encoding]::UTF8)
  $html = $html -replace 'data-nick="[^"]*"', ('data-nick="' + $s.nick + '"')
  [System.IO.File]::WriteAllText($posterTmp, $html, (New-Object System.Text.UTF8Encoding($false)))

  $q = "theme=$($s.theme)"
  if ($s.data) { $q += "&data=$($s.data)" }
  $png = "$outDir\$($s.name).png"
  if (Test-Path $png) { Remove-Item $png -Force }

  & $chrome --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files `
    --virtual-time-budget=12000 --window-size=1200,1600 `
    --screenshot="$png" "file:///$($root.Replace('\','/'))/poster.tmp.html?$q" 2>&1 | Out-Null

  if (-not (Test-Path $png)) { Write-Host "  FAIL 生成失败: $($s.name)"; continue }

  # 逐像素采样：统计不同颜色数与非背景像素占比
  Add-Type -AssemblyName System.Drawing
  $bmp = [System.Drawing.Bitmap]::FromFile($png)
  $colors = New-Object 'System.Collections.Generic.HashSet[int]'
  $nonBg = 0
  $total = 0
  for ($y = 0; $y -lt $bmp.Height; $y += 4) {
    for ($x = 0; $x -lt $bmp.Width; $x += 4) {
      $c = $bmp.GetPixel($x, $y)
      [void]$colors.Add($c.ToArgb())
      $total++
      # 背景是深色 (#0B1016 附近)，亮度高即视为有内容
      $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
      if ($lum -gt 40) { $nonBg++ }
    }
  }
  $ratio = [math]::Round(100 * $nonBg / $total, 1)
  $size = [math]::Round((Get-Item $png).Length / 1KB)
  $status = if ($ratio -gt 8 -and $colors.Count -gt 20) { 'OK  ' } else { 'BAD ' }
  Write-Host ("  {0}{1,-18} {2,4} KB  颜色数 {3,5}  非背景占比 {4,5}%" -f $status, $s.name, $size, $colors.Count, $ratio)
  $bmp.Dispose()
}
