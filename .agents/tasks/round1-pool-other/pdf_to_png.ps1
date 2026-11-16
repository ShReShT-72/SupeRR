param([string]$Pdf, [string]$OutDir, [double]$Scale = 1.3)
# Renders each page of a PDF to PNG with the Windows.Data.Pdf WinRT API (built into Windows 10/11, no installs).
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait() | Out-Null; $t.Result }
$null = [Windows.Foundation.IAsyncAction, Windows.Foundation, ContentType = WindowsRuntime]
$asTaskAction = [System.WindowsRuntimeSystemExtensions].GetMethod('AsTask', [Type[]]@([Windows.Foundation.IAsyncAction]))
function AwaitAction($op) { $t = $asTaskAction.Invoke($null, @($op)); $t.Wait() | Out-Null }
New-Item -ItemType Directory -Force $OutDir | Out-Null
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Pdf).Path)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
Write-Host "pages: $($doc.PageCount)"
for ($i = 0; $i -lt $doc.PageCount; $i++) {
  $page = $doc.GetPage($i)
  $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32]($page.Size.Width * $Scale)
  $opts.DestinationHeight = [uint32]($page.Size.Height * $Scale)
  AwaitAction ($page.RenderToStreamAsync($stream, $opts))
  $stream.Seek(0)
  $reader = [Windows.Storage.Streams.DataReader]::new($stream)
  $size = [uint32]$stream.Size
  Await ($reader.LoadAsync($size)) ([uint32]) | Out-Null
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  $name = Join-Path (Resolve-Path $OutDir).Path ("page{0:00}.png" -f ($i + 1))
  [System.IO.File]::WriteAllBytes($name, $bytes)
  Write-Host "wrote $name ($size bytes)"
  $page.Dispose()
}
