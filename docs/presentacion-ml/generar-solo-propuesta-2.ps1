param(
  [string]$OutputDirectory = $PSScriptRoot,
  [string]$BaseName = 'INHALEX-Propuesta-2-Demanda-Mensual'
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
  Purple = 0x70449A
  PalePurple = 0xF0EAF6
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

function Set-SlideBackground($Slide, [int]$Color) {
  $Slide.FollowMasterBackground = 0
  $Slide.Background.Fill.Solid()
  $Slide.Background.Fill.ForeColor.RGB = Convert-Color $Color
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
  $shape = $Slide.Shapes.AddTextbox(
    1,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
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
    [int]$FillColor = 0xFFFFFF,
    [int]$LineColor = 0xD9E3DA,
    [double]$LineWeight = 1,
    [switch]$Shadow
  )
  $shape = $Slide.Shapes.AddShape(
    5,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
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
    [double]$H = 0.34,
    [int]$FillColor = 0xE8F3E8,
    [int]$TextColor = 0x145B33,
    [double]$Size = 9,
    [int]$LineColor = 0xD9E3DA
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $FillColor -LineColor $LineColor -LineWeight 0.7)
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y $Y `
    -W ($W - 0.08) -H $H -Size $Size -Color $TextColor -Bold -Align 2)
}

function Add-Title {
  param($Slide, [string]$Title, [string]$Eyebrow)
  [void](Add-Text -Slide $Slide -Text $Eyebrow.ToUpperInvariant() -X 0.55 -Y 0.22 `
    -W 7.8 -H 0.28 -Size 9.5 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $Slide -Text $Title -X 0.55 -Y 0.48 -W 11.4 -H 0.58 `
    -Size 25.5 -Color $script:Colors.Ink -Bold)
  $line = $Slide.Shapes.AddShape(
    1,
    (Convert-ToPoint 0.55),
    (Convert-ToPoint 1.08),
    (Convert-ToPoint 12.2),
    (Convert-ToPoint 0.018)
  )
  $line.Fill.Solid()
  $line.Fill.ForeColor.RGB = Convert-Color $script:Colors.Border
  $line.Line.Visible = 0
  $circle = $Slide.Shapes.AddShape(
    9,
    (Convert-ToPoint 12.34),
    (Convert-ToPoint 0.31),
    (Convert-ToPoint 0.39),
    (Convert-ToPoint 0.39)
  )
  $circle.Fill.Solid()
  $circle.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $circle.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text '4' -X 12.37 -Y 0.33 -W 0.36 -H 0.36 `
    -Size 11 -Color $script:Colors.White -Bold -Align 2)
}

function Add-CollectionCard {
  param(
    $Slide,
    [string]$Name,
    [string[]]$Fields,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [double]$FieldSize = 8.8
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $script:Colors.White -LineColor $script:Colors.Blue -LineWeight 1.1)
  $header = $Slide.Shapes.AddShape(
    5,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint 0.32)
  )
  $header.Fill.Solid()
  $header.Fill.ForeColor.RGB = Convert-Color $script:Colors.Blue
  $header.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text $Name -X ($X + 0.08) -Y ($Y + 0.01) `
    -W ($W - 0.16) -H 0.29 -Size 11.2 -Color $script:Colors.White -Bold -Align 2)
  $fieldText = ($Fields | ForEach-Object { "• $_" }) -join "`n"
  [void](Add-Text -Slide $Slide -Text $fieldText -X ($X + 0.12) -Y ($Y + 0.38) `
    -W ($W - 0.24) -H ($H - 0.44) -Size $FieldSize -Color $script:Colors.Ink)
}

function Add-FlowArrow {
  param($Slide, [string]$Text, [double]$X, [double]$Y, [double]$W, [double]$H)
  $arrow = $Slide.Shapes.AddShape(
    33,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
  $arrow.Fill.Solid()
  $arrow.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $arrow.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y ($Y + 0.22) `
    -W ($W - 0.17) -H ($H - 0.42) -Size 7.35 -Color $script:Colors.White -Bold -Align 2)
}

function Add-DataTable {
  param(
    $Slide,
    [string[]]$Headers,
    [object[]]$Rows,
    [double[]]$ColumnWidths,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [double]$FontSize = 8,
    [switch]$HighlightLastColumn
  )
  $shape = $Slide.Shapes.AddTable(
    $Rows.Count + 1,
    $Headers.Count,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
  $table = $shape.Table
  for ($column = 1; $column -le $Headers.Count; $column++) {
    $table.Columns.Item($column).Width = Convert-ToPoint $ColumnWidths[$column - 1]
    for ($row = 1; $row -le ($Rows.Count + 1); $row++) {
      $cell = $table.Cell($row, $column).Shape
      $cell.TextFrame2.MarginLeft = Convert-ToPoint 0.025
      $cell.TextFrame2.MarginRight = Convert-ToPoint 0.025
      $cell.TextFrame2.MarginTop = Convert-ToPoint 0.015
      $cell.TextFrame2.MarginBottom = Convert-ToPoint 0.015
      $cell.TextFrame2.VerticalAnchor = 3
      $cell.TextFrame2.TextRange.Font.Name = 'Aptos'
      $cell.TextFrame2.TextRange.Font.Size = [single]$FontSize
      $cell.TextFrame2.TextRange.ParagraphFormat.Alignment = 2
      try { $cell.Line.ForeColor.RGB = Convert-Color $script:Colors.Border } catch {}
    }
  }
  for ($column = 1; $column -le $Headers.Count; $column++) {
    $cell = $table.Cell(1, $column).Shape
    $cell.TextFrame2.TextRange.Text = $Headers[$column - 1]
    $cell.TextFrame2.TextRange.Font.Bold = -1
    $cell.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
    $cell.Fill.Solid()
    if ($HighlightLastColumn -and $column -eq $Headers.Count) {
      $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.Purple
    } else {
      $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.Forest
    }
  }
  for ($row = 2; $row -le ($Rows.Count + 1); $row++) {
    for ($column = 1; $column -le $Headers.Count; $column++) {
      $cell = $table.Cell($row, $column).Shape
      $cell.TextFrame2.TextRange.Text = [string]$Rows[$row - 2][$column - 1]
      $cell.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.Ink
      $cell.Fill.Solid()
      if ($HighlightLastColumn -and $column -eq $Headers.Count) {
        $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.PalePurple
        $cell.TextFrame2.TextRange.Font.Bold = -1
      } else {
        $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
      }
    }
  }
  return $shape
}

function Set-SpeakerNotes($Slide, [string]$Notes) {
  try {
    $placeholders = $Slide.NotesPage.Shapes.Placeholders
    for ($index = 1; $index -le $placeholders.Count; $index++) {
      $placeholder = $placeholders.Item($index)
      if ($placeholder.PlaceholderFormat.Type -eq 2) {
        $placeholder.TextFrame.TextRange.Text = $Notes
        return
      }
    }
  } catch {}
}

$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null
$pptxPath = Join-Path $output "$BaseName.pptx"
$pdfPath = Join-Path $output "$BaseName.pdf"
$pngPath = Join-Path $output "$BaseName.png"

$powerPoint = $null
$presentation = $null
$slide = $null
$powerPointIdsBefore = @(
  Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }
)
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
  Set-SlideBackground -Slide $slide -Color $script:Colors.Cream

  Add-Title -Slide $slide `
    -Title 'Propuesta 2 · Predicción mensual de demanda por producto' `
    -Eyebrow 'Regresión supervisada · un producto y un mes objetivo'
  Add-Pill -Slide $slide -Text '288 filas base · 240 entrenables' `
    -X 9.82 -Y 0.18 -W 2.08 -H 0.32 `
    -FillColor $script:Colors.PalePurple -TextColor $script:Colors.Purple -Size 8.3

  [void](Add-Text -Slide $slide -Text 'COLECCIONES MONGODB' `
    -X 0.58 -Y 1.2 -W 2.95 -H 0.27 -Size 10.2 -Color $script:Colors.Blue -Bold -Align 2)

  Add-CollectionCard -Slide $slide -Name 'pedidos' -Fields @(
    'status / createdAt'
    '_id / reference'
    'items[].productId'
    'items[]: requestedQuantity / unitPrice'
  ) -X 0.58 -Y 1.5 -W 2.95 -H 1.47 -FieldSize 8.6

  Add-CollectionCard -Slide $slide -Name 'productos' -Fields @(
    '_id / name / category'
    'status / createdAt'
  ) -X 0.58 -Y 3.1 -W 2.95 -H 1.02 -FieldSize 8.8

  Add-CollectionCard -Slide $slide -Name 'reseñas_producto' -Fields @(
    'productId / rating'
    'status / createdAt'
  ) -X 0.58 -Y 4.25 -W 2.95 -H 1.02 -FieldSize 8.8

  [void](Add-RoundedBox -Slide $slide -X 0.58 -Y 5.51 -W 2.95 -H 1.02 `
    -FillColor $script:Colors.PaleBlue -LineColor $script:Colors.Blue -LineWeight 0.8)
  [void](Add-Text -Slide $slide -Text 'DECISIÓN DE TRAZABILIDAD' `
    -X 0.78 -Y 5.62 -W 2.55 -H 0.22 -Size 8.7 -Color $script:Colors.Blue -Bold -Align 2)
  [void](Add-Text -Slide $slide `
    -Text "Promoción e inventario histórico no entran en X.`nEl stock actual se consulta después del pronóstico." `
    -X 0.78 -Y 5.92 -W 2.55 -H 0.46 -Size 8.1 -Color $script:Colors.Ink -Align 2)

  Add-FlowArrow -Slide $slide `
    -Text "FILTRAR PEDIDOS`nDESANIDAR ITEMS[]`nAGRUPAR POR MES`nCREAR LAGS" `
    -X 3.72 -Y 2.58 -W 1.08 -H 1.55
  [void](Add-Text -Slide $slide `
    -Text "Válidos:`npending_review`nconfirmed`ncompleted" `
    -X 3.58 -Y 4.32 -W 1.38 -H 0.84 -Size 7.7 -Color $script:Colors.Muted -Bold -Align 2)
  [void](Add-Text -Slide $slide `
    -Text "Completar con 0 los meses sin pedidos.`nX solo usa datos anteriores al mes objetivo." `
    -X 3.48 -Y 5.33 -W 1.58 -H 0.72 -Size 7.5 -Color $script:Colors.Coral -Align 2)

  [void](Add-RoundedBox -Slide $slide -X 4.98 -Y 1.34 -W 7.78 -H 5.59 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Text -Slide $slide `
    -Text 'Dataset mensual · una fila por producto y mes objetivo' `
    -X 5.22 -Y 1.5 -W 7.2 -H 0.32 -Size 14.4 -Color $script:Colors.Forest -Bold)
  Add-Pill -Slide $slide `
    -Text 'Ejemplo verificado · corte 31/05/2026 → mes objetivo junio 2026' `
    -X 5.22 -Y 1.86 -W 4.3 -H 0.3 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 7.9
  [void](Add-Text -Slide $slide -Text 'Variables de identificación e historial de demanda' `
    -X 9.66 -Y 1.89 -W 2.58 -H 0.22 -Size 7.8 -Color $script:Colors.Muted -Align 3)

  $historyHeaders = @(
    'corte → mes'
    'producto / ID'
    'categoría'
    'dem. M−1'
    'dem. M−2'
    'dem. M−3'
    'prom. 3M'
  )
  $historyRows = @(
    ,@(
      "31/05`n→ 2026-06"
      "Lavanda`nSYN-PROD-006"
      'línea-insomnio'
      '46'
      '51'
      '55'
      '50.67'
    )
  )
  [void](Add-DataTable -Slide $slide -Headers $historyHeaders -Rows $historyRows `
    -ColumnWidths @(1.1, 1.05, 1.5, 0.8, 0.8, 0.8, 1.2) `
    -X 5.22 -Y 2.26 -W 7.25 -H 0.84 -FontSize 7.8)

  $contextHeaders = @(
    'pedidos M−1'
    'precio M−1'
    'rating al corte'
    'reseñas al corte'
    'núm. mes'
    'Y: unidades mes'
  )
  $contextRows = @(
    ,@('38', '$56.48', '4.29', '31', '6', '55')
  )
  [void](Add-DataTable -Slide $slide -Headers $contextHeaders -Rows $contextRows `
    -ColumnWidths @(1.25, 1.25, 1.1, 1.1, 1.1, 1.45) `
    -X 5.22 -Y 3.22 -W 7.25 -H 0.78 -FontSize 8.1 -HighlightLastColumn)

  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 4.25 -W 4.55 -H 1.12 `
    -FillColor $script:Colors.PaleGreen -LineColor $script:Colors.Green -LineWeight 1.05)
  [void](Add-Text -Slide $slide -Text 'VARIABLES X · conocidas al 31 de mayo' `
    -X 5.45 -Y 4.37 -W 3.95 -H 0.22 -Size 8.8 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $slide `
    -Text "categoría · demanda M−1/M−2/M−3 · promedio 3M`npedidos · precio · rating/reseñas · número de mes" `
    -X 5.45 -Y 4.72 -W 4.05 -H 0.46 -Size 8.8 -Color $script:Colors.Ink)

  [void](Add-RoundedBox -Slide $slide -X 9.96 -Y 4.25 -W 2.51 -H 1.12 `
    -FillColor $script:Colors.PalePurple -LineColor $script:Colors.Purple -LineWeight 1.05)
  [void](Add-Text -Slide $slide -Text 'VARIABLE Y · REGRESIÓN' `
    -X 10.16 -Y 4.37 -W 2.08 -H 0.22 -Size 8.6 -Color $script:Colors.Purple -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text "55 unidades solicitadas`nen junio de 2026" `
    -X 10.16 -Y 4.72 -W 2.08 -H 0.43 -Size 10.2 -Color $script:Colors.Ink -Bold -Align 2)

  Add-Pill -Slide $slide -Text '16 productos × 18 meses' `
    -X 5.22 -Y 5.59 -W 1.82 -H 0.32 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 8.2
  Add-Pill -Slide $slide -Text '288 filas producto–mes' `
    -X 7.19 -Y 5.59 -W 1.75 -H 0.32 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 8.2
  Add-Pill -Slide $slide -Text '240 filas entrenables' `
    -X 9.09 -Y 5.59 -W 1.66 -H 0.32 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 8.2
  Add-Pill -Slide $slide -Text 'corte cronológico' `
    -X 10.9 -Y 5.59 -W 1.57 -H 0.32 `
    -FillColor $script:Colors.PaleAmber -TextColor $script:Colors.Amber -Size 8.2

  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 6.08 -W 7.25 -H 0.5 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber -LineWeight 0.85)
  [void](Add-Text -Slide $slide `
    -Text 'UTILIDAD · anticipar la demanda del próximo mes y planear el reabastecimiento.' `
    -X 5.42 -Y 6.15 -W 6.85 -H 0.28 -Size 9.4 -Color $script:Colors.Ink -Bold -Align 2)
  [void](Add-Text -Slide $slide `
    -Text 'MongoDB aporta hechos históricos; Jupyter agrega por mes y calcula lags, promedios y Y sin usar información futura.' `
    -X 5.27 -Y 6.69 -W 7.15 -H 0.17 -Size 7.25 -Color $script:Colors.Coral -Align 2)

  [void](Add-Text -Slide $slide `
    -Text 'INHALEX · Propuesta de aprendizaje automático' `
    -X 0.58 -Y 7.16 -W 8.8 -H 0.2 -Size 8 -Color $script:Colors.Muted)

  $notes = @'
Esta propuesta es una regresión supervisada con horizonte mensual. Cada fila representa un producto y un mes objetivo. Para predecir junio hacemos un corte al 31 de mayo y usamos únicamente información disponible hasta ese día.

La demanda se define como unidades solicitadas. Se calcula con items[].requestedQuantity de pedidos pending_review, confirmed o completed. No usamos ventas_agregadas.totalUnits como Y porque ese campo representa unidades surtidas, no todo lo solicitado.

En Jupyter desanidamos items[], agrupamos por producto y mes, añadimos los meses con cero pedidos y calculamos tres rezagos mensuales y su promedio. Productos aporta el catálogo y la categoría; reseñas_producto permite reconstruir rating y número de reseñas acumulados al corte.

En el ejemplo verificado de Lavanda, para junio de 2026 los tres meses anteriores tuvieron 46, 51 y 55 unidades; el promedio fue 50.67. Mayo tuvo 38 pedidos, precio promedio de 56.48 pesos y el producto acumulaba 31 reseñas con rating 4.29. La Y observada en junio fue de 55 unidades.

El dataset tiene 16 productos por 18 meses, es decir, 288 filas base. Al exigir tres meses previos completos quedan 240 filas entrenables. La división debe ser cronológica. Después de pronosticar, se compara la demanda con stockAvailable y stockMin para sugerir reabastecimiento; el stock actual no se usa como si fuera histórico.
'@
  Set-SpeakerNotes -Slide $slide -Notes $notes

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
    try {
      $presentation.Saved = -1
      $presentation.Close()
    } catch {}
    try { $presentation.Saved = -1 } catch {}
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) } catch {}
  }
  if ($null -ne $powerPoint) {
    try {
      if ($powerPoint.Presentations.Count -eq 0) {
        $powerPoint.Quit()
      }
    } catch {}
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerPoint) } catch {}
  }
  [GC]::Collect()
  foreach ($processId in $ownedPowerPointIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $process -and $process.ProcessName -eq 'POWERPNT' -and `
      $process.MainWindowHandle -eq 0) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
}
