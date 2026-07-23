param(
  [string]$OutputDirectory = $PSScriptRoot,
  [string]$BaseName = 'INHALEX-Propuesta-1-Apriori'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Point = 72.0
$script:Colors = @{
  Cream = 0xF8F6F0
  White = 0xFFFFFF
  Ink = 0x142019
  Muted = 0x5F6F65
  Green = 0x087A2B
  Forest = 0x145B33
  PaleGreen = 0xE8F3E8
  Blue = 0x234C7A
  PaleBlue = 0xE9F0F8
  Amber = 0xE7A227
  PaleAmber = 0xFFF4DC
  Coral = 0xD9685F
  Border = 0xD9E3DA
}

function Convert-ToPoint([double]$Value) {
  return [single]($Value * $script:Point)
}

function Convert-Color([int]$Rgb) {
  $r = ($Rgb -shr 16) -band 0xFF
  $g = ($Rgb -shr 8) -band 0xFF
  $b = $Rgb -band 0xFF
  return [int]($r + 256 * $g + 65536 * $b)
}

function Add-Text {
  param(
    $Slide,
    [string]$Text,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [double]$Size = 18,
    [int]$Color = 0x142019,
    [switch]$Bold,
    [int]$Align = 1,
    [double]$Margin = 0.04,
    [int]$VerticalAnchor = 1
  )
  $shape = $Slide.Shapes.AddTextbox(1, (Convert-ToPoint $X), (Convert-ToPoint $Y), (Convert-ToPoint $W), (Convert-ToPoint $H))
  $shape.TextFrame2.TextRange.Text = $Text
  $shape.TextFrame2.AutoSize = 0
  $shape.TextFrame2.WordWrap = -1
  $shape.TextFrame2.MarginLeft = Convert-ToPoint $Margin
  $shape.TextFrame2.MarginRight = Convert-ToPoint $Margin
  $shape.TextFrame2.MarginTop = Convert-ToPoint $Margin
  $shape.TextFrame2.MarginBottom = Convert-ToPoint $Margin
  $shape.TextFrame2.VerticalAnchor = $VerticalAnchor
  $shape.TextFrame2.TextRange.Font.Name = 'Aptos'
  $shape.TextFrame2.TextRange.Font.Size = [single]$Size
  $shape.TextFrame2.TextRange.Font.Bold = if ($Bold) { -1 } else { 0 }
  $shape.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $Color
  $shape.TextFrame2.TextRange.ParagraphFormat.Alignment = $Align
  return $shape
}

function Add-RoundedBox {
  param(
    $Slide,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [int]$FillColor,
    [int]$LineColor,
    [double]$LineWeight = 1,
    [switch]$Shadow
  )
  $shape = $Slide.Shapes.AddShape(5, (Convert-ToPoint $X), (Convert-ToPoint $Y), (Convert-ToPoint $W), (Convert-ToPoint $H))
  $shape.Fill.Solid()
  $shape.Fill.ForeColor.RGB = Convert-Color $FillColor
  $shape.Line.ForeColor.RGB = Convert-Color $LineColor
  $shape.Line.Weight = [single]$LineWeight
  if ($Shadow) {
    try {
      $shape.Shadow.Visible = -1
      $shape.Shadow.Blur = 8
      $shape.Shadow.Transparency = 0.82
      $shape.Shadow.OffsetX = 1
      $shape.Shadow.OffsetY = 2
    } catch {}
  }
  return $shape
}

function Add-Pill {
  param(
    $Slide,
    [string]$Text,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [int]$FillColor,
    [int]$TextColor,
    [double]$Size = 9
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H -FillColor $FillColor -LineColor $script:Colors.Border -LineWeight 0.7)
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y $Y -W ($W - 0.08) -H $H -Size $Size -Color $TextColor -Bold -Align 2)
}

function Add-Title {
  param($Slide, [string]$Title, [string]$Eyebrow)
  [void](Add-Text -Slide $Slide -Text $Eyebrow.ToUpperInvariant() -X 0.55 -Y 0.22 -W 7.8 -H 0.28 -Size 9.5 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $Slide -Text $Title -X 0.55 -Y 0.48 -W 11.55 -H 0.58 -Size 25.5 -Color $script:Colors.Ink -Bold)
  $line = $Slide.Shapes.AddShape(1, (Convert-ToPoint 0.55), (Convert-ToPoint 1.08), (Convert-ToPoint 12.2), (Convert-ToPoint 0.018))
  $line.Fill.Solid()
  $line.Fill.ForeColor.RGB = Convert-Color $script:Colors.Border
  $line.Line.Visible = 0
  $circle = $Slide.Shapes.AddShape(9, (Convert-ToPoint 12.34), (Convert-ToPoint 0.31), (Convert-ToPoint 0.39), (Convert-ToPoint 0.39))
  $circle.Fill.Solid()
  $circle.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $circle.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text '2' -X 12.37 -Y 0.33 -W 0.36 -H 0.36 -Size 11 -Color $script:Colors.White -Bold -Align 2)
}

function Add-CollectionCard {
  param($Slide, [double]$X, [double]$Y, [double]$W, [double]$H)
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H -FillColor $script:Colors.White -LineColor $script:Colors.Blue -LineWeight 1.1)
  $header = $Slide.Shapes.AddShape(5, (Convert-ToPoint $X), (Convert-ToPoint $Y), (Convert-ToPoint $W), (Convert-ToPoint 0.34))
  $header.Fill.Solid()
  $header.Fill.ForeColor.RGB = Convert-Color $script:Colors.Blue
  $header.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text 'pedidos' -X ($X + 0.1) -Y ($Y + 0.01) -W ($W - 0.2) -H 0.3 -Size 11.5 -Color $script:Colors.White -Bold -Align 2)
  $fields = "• reference`n• status`n• items[].productName"
  [void](Add-Text -Slide $Slide -Text $fields -X ($X + 0.16) -Y ($Y + 0.45) -W ($W - 0.32) -H ($H - 0.55) -Size 9.5 -Color $script:Colors.Ink)
}

function Add-FlowArrow {
  param($Slide, [string]$Text, [double]$X, [double]$Y, [double]$W, [double]$H)
  $arrow = $Slide.Shapes.AddShape(33, (Convert-ToPoint $X), (Convert-ToPoint $Y), (Convert-ToPoint $W), (Convert-ToPoint $H))
  $arrow.Fill.Solid()
  $arrow.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $arrow.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y ($Y + 0.31) -W ($W - 0.17) -H ($H - 0.6) -Size 7.6 -Color $script:Colors.White -Bold -Align 2)
}

function Add-DataTable {
  param($Slide, [double]$X, [double]$Y, [double]$W, [double]$H)
  $rows = @(
    ,@('SYN-ORD-000001', 'Toronjil, Jengibre')
    ,@('SYN-ORD-000002', 'Vaporub, Eucalipto')
    ,@('SYN-ORD-000003', 'Vaporub')
    ,@('SYN-ORD-000004', 'Lavanda')
    ,@('SYN-ORD-000005', 'Toronjil, Lavanda')
  )
  $shape = $Slide.Shapes.AddTable(6, 2, (Convert-ToPoint $X), (Convert-ToPoint $Y), (Convert-ToPoint $W), (Convert-ToPoint $H))
  $table = $shape.Table
  $table.Columns.Item(1).Width = Convert-ToPoint 2.15
  $table.Columns.Item(2).Width = Convert-ToPoint 5.1
  for ($row = 1; $row -le 6; $row++) {
    for ($column = 1; $column -le 2; $column++) {
      $cell = $table.Cell($row, $column).Shape
      $cell.TextFrame2.MarginLeft = Convert-ToPoint 0.05
      $cell.TextFrame2.MarginRight = Convert-ToPoint 0.05
      $cell.TextFrame2.MarginTop = Convert-ToPoint 0.02
      $cell.TextFrame2.MarginBottom = Convert-ToPoint 0.02
      $cell.TextFrame2.VerticalAnchor = 3
      $cell.TextFrame2.TextRange.Font.Name = 'Aptos'
      $cell.TextFrame2.TextRange.Font.Size = 9.1
      $cell.TextFrame2.TextRange.ParagraphFormat.Alignment = 2
      try { $cell.Line.ForeColor.RGB = Convert-Color $script:Colors.Border } catch {}
    }
  }
  $headers = @('TID', 'Items')
  for ($column = 1; $column -le 2; $column++) {
    $cell = $table.Cell(1, $column).Shape
    $cell.TextFrame2.TextRange.Text = $headers[$column - 1]
    $cell.TextFrame2.TextRange.Font.Bold = -1
    $cell.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
    $cell.Fill.Solid()
    $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.Forest
  }
  for ($row = 2; $row -le 6; $row++) {
    for ($column = 1; $column -le 2; $column++) {
      $cell = $table.Cell($row, $column).Shape
      $cell.TextFrame2.TextRange.Text = [string]$rows[$row - 2][$column - 1]
      $cell.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.Ink
      $cell.Fill.Solid()
      $cell.Fill.ForeColor.RGB = Convert-Color $(if (($row % 2) -eq 0) { $script:Colors.White } else { $script:Colors.Cream })
    }
  }
}

$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null
$pptxPath = Join-Path $output "$BaseName.pptx"
$pdfPath = Join-Path $output "$BaseName.pdf"
$pngPath = Join-Path $output "$BaseName.png"

$powerPoint = $null
$presentation = $null
$slide = $null
$powerPointIdsBefore = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$ownedPowerPointIds = @()
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $ownedPowerPointIds = @(
    Get-Process POWERPNT -ErrorAction SilentlyContinue |
      Where-Object { $_.Id -notin $powerPointIdsBefore } |
      ForEach-Object { $_.Id }
  )
  $powerPoint.Visible = -1
  $powerPoint.DisplayAlerts = 1
  try { $powerPoint.WindowState = 2 } catch {}
  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  $slide = $presentation.Slides.Add(1, 12)
  $slide.FollowMasterBackground = 0
  $slide.Background.Fill.Solid()
  $slide.Background.Fill.ForeColor.RGB = Convert-Color $script:Colors.Cream

  Add-Title -Slide $slide -Title 'Propuesta 1 · Recomendación de aroma complementario' -Eyebrow 'Sistema de recomendación · Reglas de asociación con Apriori'
  Add-Pill -Slide $slide -Text '1,674 canastas · sin Y' -X 10.02 -Y 0.18 -W 1.83 -H 0.32 -FillColor $script:Colors.PaleGreen -TextColor $script:Colors.Forest -Size 8.8

  [void](Add-Text -Slide $slide -Text 'COLECCIÓN MONGODB' -X 0.58 -Y 1.22 -W 3.1 -H 0.3 -Size 10.5 -Color $script:Colors.Blue -Bold -Align 2)
  Add-CollectionCard -Slide $slide -X 0.58 -Y 1.55 -W 2.95 -H 1.55

  [void](Add-RoundedBox -Slide $slide -X 0.58 -Y 3.35 -W 2.95 -H 1.52 -FillColor $script:Colors.PaleBlue -LineColor $script:Colors.Blue -LineWeight 0.9)
  [void](Add-Text -Slide $slide -Text 'TRAZABILIDAD DIRECTA' -X 0.78 -Y 3.49 -W 2.55 -H 0.24 -Size 9.2 -Color $script:Colors.Blue -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text "reference  →  TID`nitems[].productName  →  Items`nstatus = completed  →  filtro" -X 0.78 -Y 3.82 -W 2.55 -H 0.78 -Size 9.2 -Color $script:Colors.Ink -Align 2)
  Add-Pill -Slide $slide -Text '1 colección · sin datos personales' -X 0.72 -Y 5.15 -W 2.68 -H 0.36 -FillColor $script:Colors.PaleGreen -TextColor $script:Colors.Forest -Size 8.8

  Add-FlowArrow -Slide $slide -Text "FILTRAR completed`nEXTRAER ITEMS[]`nAGRUPAR POR TID" -X 3.72 -Y 2.72 -W 1.08 -H 1.52
  [void](Add-Text -Slide $slide -Text 'Items = lista construida en Jupyter' -X 3.5 -Y 4.42 -W 1.55 -H 0.6 -Size 8.1 -Color $script:Colors.Muted -Align 2)

  [void](Add-RoundedBox -Slide $slide -X 4.98 -Y 1.36 -W 7.78 -H 5.57 -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Text -Slide $slide -Text 'Dataset transaccional · una fila por pedido o canasta' -X 5.22 -Y 1.53 -W 7.25 -H 0.34 -Size 15 -Color $script:Colors.Forest -Bold)
  Add-DataTable -Slide $slide -X 5.22 -Y 1.96 -W 7.25 -H 2.13

  Add-Pill -Slide $slide -Text '1,674 canastas' -X 5.22 -Y 4.26 -W 1.48 -H 0.34 -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue
  Add-Pill -Slide $slide -Text '3,003 ítems' -X 6.84 -Y 4.26 -W 1.32 -H 0.34 -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue
  Add-Pill -Slide $slide -Text '16 productos' -X 8.3 -Y 4.26 -W 1.28 -H 0.34 -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue
  Add-Pill -Slide $slide -Text 'SYN = sintético · ORD = pedido' -X 9.72 -Y 4.26 -W 2.38 -H 0.34 -FillColor $script:Colors.PaleAmber -TextColor $script:Colors.Amber -Size 8.4

  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 4.82 -W 7.25 -H 1.25 -FillColor $script:Colors.PaleGreen -LineColor $script:Colors.Green -LineWeight 1.1)
  [void](Add-Text -Slide $slide -Text 'APRIORI · APRENDIZAJE NO SUPERVISADO' -X 5.48 -Y 4.94 -W 3.35 -H 0.24 -Size 9.1 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $slide -Text 'X: productos presentes en la canasta   ·   Y: no aplica' -X 8.39 -Y 4.94 -W 3.76 -H 0.24 -Size 9.1 -Color $script:Colors.Forest -Bold -Align 3)
  [void](Add-Text -Slide $slide -Text 'Vaporub  →  Eucalipto' -X 5.48 -Y 5.32 -W 2.55 -H 0.36 -Size 15.5 -Color $script:Colors.Ink -Bold)
  [void](Add-Text -Slide $slide -Text 'Soporte: 3.52 %  ·  Confianza: 26.94 %  ·  Lift: 1.88' -X 8.07 -Y 5.34 -W 4.08 -H 0.3 -Size 9.4 -Color $script:Colors.Ink -Align 3)

  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 6.21 -W 7.25 -H 0.4 -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber -LineWeight 0.8)
  [void](Add-Text -Slide $slide -Text 'Aplicación: si la bolsa contiene Vaporub, recomendar Eucalipto como Top-1.' -X 5.42 -Y 6.25 -W 6.85 -H 0.27 -Size 9.5 -Color $script:Colors.Ink -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text 'Resultados calculados sobre datos sintéticos compatibles con la estructura operacional de INHALEX.' -X 5.24 -Y 6.64 -W 7.2 -H 0.18 -Size 7.7 -Color $script:Colors.Coral -Align 2)
  [void](Add-Text -Slide $slide -Text 'INHALEX · Propuesta de aprendizaje automático' -X 0.58 -Y 7.16 -W 8.8 -H 0.2 -Size 8 -Color $script:Colors.Muted)

  $presentation.SaveAs($pptxPath, 24)
  $presentation.SaveAs($pdfPath, 32)
  $slide.Export($pngPath, 'PNG', 1600, 900)

  [pscustomobject]@{
    pptx = $pptxPath
    pdf = $pdfPath
    png = $pngPath
    slides = 1
  } | ConvertTo-Json -Compress
}
finally {
  if ($null -ne $slide) {
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($slide) } catch {}
  }
  if ($null -ne $presentation) {
    try { $presentation.Saved = -1 } catch {}
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) } catch {}
  }
  if ($null -ne $powerPoint) {
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerPoint) } catch {}
  }
  [GC]::Collect()
  foreach ($processId in $ownedPowerPointIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $process -and $process.ProcessName -eq 'POWERPNT' -and $process.MainWindowHandle -eq 0) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
}
