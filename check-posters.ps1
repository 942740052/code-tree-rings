# 海报非空校验：统计颜色数与非背景像素占比
# 用法：pwsh -File check-posters.ps1
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Drawing

$dir = 'D:\trae-active\posters'
$files = Get-ChildItem $dir -Filter '*.png' | Sort-Object Name
$bad = 0

foreach ($f in $files) {
  $bmp = New-Object System.Drawing.Bitmap($f.FullName)
  $colors = @{}
  $nonBg = 0
  $total = 0
  for ($y = 0; $y -lt $bmp.Height; $y += 3) {
    for ($x = 0; $x -lt $bmp.Width; $x += 3) {
      $c = $bmp.GetPixel($x, $y)
      $key = '{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B
      if ($colors.ContainsKey($key)) { $colors[$key]++ } else { $colors[$key] = 1 }
      $total++
      $lum = (0.299 * $c.R) + (0.587 * $c.G) + (0.114 * $c.B)
      if ($lum -gt 40) { $nonBg++ }
    }
  }
  $bmp.Dispose()
  $ratio = [math]::Round(100.0 * $nonBg / $total, 1)
  $nColors = $colors.Count
  $ok = ($ratio -gt 8) -and ($nColors -gt 20)
  if (-not $ok) { $bad++ }
  Write-Host ("  {0} {1,-20} {2,4} KB  颜色数 {3,5}  非背景 {4,5}%" -f $(if ($ok) { 'OK ' } else { 'BAD' }), $f.Name, [math]::Round($f.Length/1KB), $nColors, $ratio)
}
Write-Host ''
if ($bad -eq 0) { Write-Host "全部 $((($files | Measure-Object).Count)) 张海报均非空" }
else { Write-Host "$bad 张海报异常" }
