param(
  [string]$OutputDirectory = $PSScriptRoot,
  [string]$BaseName = 'INHALEX-Propuestas-ML',
  [string]$PreviewDirectoryName = 'preview'
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
  Mint = 0x69C6A7
  Lime = 0x8CC653
  PaleGreen = 0xE8F3E8
  Blue = 0x234C7A
  PaleBlue = 0xE9F0F8
  Purple = 0x70449A
  PalePurple = 0xF0EAF6
  Amber = 0xE7A227
  PaleAmber = 0xFFF4DC
  Coral = 0xD9685F
  PaleCoral = 0xFBEAE7
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
    [string]$Font = 'Aptos',
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
  $shape.TextFrame2.TextRange.Font.Name = $Font
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
    [double]$Transparency = 0,
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
  $shape.Fill.Transparency = [single]$Transparency
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
    [double]$Size = 10,
    [int]$LineColor = 0xD9E3DA
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $FillColor -LineColor $LineColor -LineWeight 0.7)
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y $Y `
    -W ($W - 0.08) -H $H -Size $Size -Color $TextColor -Bold -Align 2)
}

function Add-Title {
  param(
    $Slide,
    [string]$Title,
    [string]$Eyebrow,
    [int]$Number
  )
  [void](Add-Text -Slide $Slide -Text $Eyebrow.ToUpperInvariant() -X 0.55 -Y 0.22 `
    -W 5.8 -H 0.28 -Size 9.5 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $Slide -Text $Title -X 0.55 -Y 0.48 -W 10.7 -H 0.58 `
    -Size 27 -Color $script:Colors.Ink -Bold)
  $line = $Slide.Shapes.AddShape(1, (Convert-ToPoint 0.55), (Convert-ToPoint 1.08), `
    (Convert-ToPoint 12.2), (Convert-ToPoint 0.018))
  $line.Fill.Solid()
  $line.Fill.ForeColor.RGB = Convert-Color $script:Colors.Border
  $line.Line.Visible = 0
  $circle = $Slide.Shapes.AddShape(9, (Convert-ToPoint 12.34), (Convert-ToPoint 0.31), `
    (Convert-ToPoint 0.39), (Convert-ToPoint 0.39))
  $circle.Fill.Solid()
  $circle.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $circle.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text ([string]$Number) -X 12.37 -Y 0.33 `
    -W 0.36 -H 0.36 -Size 11 -Color $script:Colors.White -Bold -Align 2)
}

function Add-Footer {
  param($Slide, [string]$Text = 'INHALEX · Propuestas de aprendizaje automático')
  [void](Add-Text -Slide $Slide -Text $Text -X 0.58 -Y 7.16 -W 8.8 -H 0.2 `
    -Size 8 -Color $script:Colors.Muted)
}

function Add-Picture {
  param(
    $Slide,
    [string]$Path,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H
  )
  return $Slide.Shapes.AddPicture(
    $Path,
    0,
    -1,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
}

function Add-CollectionCard {
  param(
    $Slide,
    [string]$Name,
    [string[]]$Fields,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $script:Colors.White -LineColor $script:Colors.Blue -LineWeight 1.1)
  $header = $Slide.Shapes.AddShape(5, (Convert-ToPoint $X), (Convert-ToPoint $Y), `
    (Convert-ToPoint $W), (Convert-ToPoint 0.32))
  $header.Fill.Solid()
  $header.Fill.ForeColor.RGB = Convert-Color $script:Colors.Blue
  $header.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text $Name -X ($X + 0.1) -Y ($Y + 0.01) `
    -W ($W - 0.2) -H 0.29 -Size 11.5 -Color $script:Colors.White -Bold -Align 2)
  $fieldText = ($Fields | ForEach-Object { "• $_" }) -join "`n"
  [void](Add-Text -Slide $Slide -Text $fieldText -X ($X + 0.12) -Y ($Y + 0.37) `
    -W ($W - 0.24) -H ($H - 0.42) -Size 9.3 -Color $script:Colors.Ink `
    -VerticalAnchor 1)
}

function Add-FlowArrow {
  param($Slide, [string]$Text, [double]$X, [double]$Y, [double]$W, [double]$H)
  $arrow = $Slide.Shapes.AddShape(33, (Convert-ToPoint $X), (Convert-ToPoint $Y), `
    (Convert-ToPoint $W), (Convert-ToPoint $H))
  $arrow.Fill.Solid()
  $arrow.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $arrow.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y ($Y + 0.29) `
    -W ($W - 0.17) -H ($H - 0.56) -Size 7.7 -Color $script:Colors.White `
    -Bold -Align 2)
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
    [int]$HeaderColor = 0x145B33,
    [int]$LastColumnColor = -1,
    [double]$FontSize = 8.6
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
    if ($ColumnWidths.Count -ge $column) {
      $table.Columns.Item($column).Width = Convert-ToPoint $ColumnWidths[$column - 1]
    }
    for ($row = 1; $row -le ($Rows.Count + 1); $row++) {
      $cellShape = $table.Cell($row, $column).Shape
      $cellShape.TextFrame2.MarginLeft = Convert-ToPoint 0.04
      $cellShape.TextFrame2.MarginRight = Convert-ToPoint 0.04
      $cellShape.TextFrame2.MarginTop = Convert-ToPoint 0.02
      $cellShape.TextFrame2.MarginBottom = Convert-ToPoint 0.02
      $cellShape.TextFrame2.VerticalAnchor = 3
      $cellShape.TextFrame2.TextRange.Font.Name = 'Aptos'
      $cellShape.TextFrame2.TextRange.Font.Size = [single]$FontSize
      $cellShape.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.Ink
      $cellShape.TextFrame2.TextRange.ParagraphFormat.Alignment = 2
      try { $cellShape.Line.ForeColor.RGB = Convert-Color $script:Colors.Border } catch {}
    }
  }
  for ($column = 1; $column -le $Headers.Count; $column++) {
    $cellShape = $table.Cell(1, $column).Shape
    $cellShape.TextFrame2.TextRange.Text = $Headers[$column - 1]
    $cellShape.TextFrame2.TextRange.Font.Bold = -1
    $cellShape.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
    $cellShape.Fill.Solid()
    $cellShape.Fill.ForeColor.RGB = Convert-Color $HeaderColor
  }
  for ($row = 2; $row -le ($Rows.Count + 1); $row++) {
    for ($column = 1; $column -le $Headers.Count; $column++) {
      $cellShape = $table.Cell($row, $column).Shape
      $cellShape.TextFrame2.TextRange.Text = [string]$Rows[$row - 2][$column - 1]
      $cellShape.Fill.Solid()
      if ($LastColumnColor -ge 0 -and $column -eq $Headers.Count) {
        $cellShape.Fill.ForeColor.RGB = Convert-Color $LastColumnColor
      } elseif (($row % 2) -eq 0) {
        $cellShape.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
      } else {
        $cellShape.Fill.ForeColor.RGB = Convert-Color $script:Colors.Cream
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
  } catch {
    # El guion completo también se entrega en guion-exposicion.md.
  }
}

function Add-VisualBadge($Slide) {
  Add-Pill -Slide $Slide -Text 'DISEÑO CONCEPTUAL' -X 10.75 -Y 0.53 -W 1.72 `
    -H 0.31 -FillColor $script:Colors.PaleAmber -TextColor $script:Colors.Amber `
    -LineColor $script:Colors.Amber -Size 8.6
}

$output = [IO.Path]::GetFullPath($OutputDirectory)
$assetDirectory = Join-Path $output 'assets'
$previewDirectory = Join-Path $output $PreviewDirectoryName
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))

$paths = @{
  Logo = Join-Path $workspace 'Client\public\images\logoletras.png'
  Screenshot = Join-Path $assetDirectory 'captura-inhalex-inicio-v2.png'
  Recommendation = Join-Path $assetDirectory 'mockup-recomendacion-base.png'
  Demand = Join-Path $assetDirectory 'mockup-demanda-base.png'
  Segmentation = Join-Path $assetDirectory 'mockup-segmentacion-base.png'
}

foreach ($item in $paths.GetEnumerator()) {
  if (-not (Test-Path -LiteralPath $item.Value)) {
    throw "Falta el recurso $($item.Key): $($item.Value)"
  }
}

New-Item -ItemType Directory -Path $output -Force | Out-Null
New-Item -ItemType Directory -Path $previewDirectory -Force | Out-Null

$powerPoint = $null
$presentation = $null
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $powerPoint.Visible = -1
  $powerPoint.DisplayAlerts = 1
  try { $powerPoint.WindowState = 2 } catch {}
  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  # 1. Portada
  $slide = $presentation.Slides.Add(1, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  $accent = $slide.Shapes.AddShape(1, 0, 0, (Convert-ToPoint 0.13), 540)
  $accent.Fill.Solid()
  $accent.Fill.ForeColor.RGB = Convert-Color $script:Colors.Green
  $accent.Line.Visible = 0
  [void](Add-Picture -Slide $slide -Path $paths.Logo -X 0.58 -Y 0.25 -W 2.6 -H 1.28)
  [void](Add-Text -Slide $slide -Text 'AROMATERAPIA INTELIGENTE CON DATOS' -X 0.68 -Y 1.42 `
    -W 4.2 -H 0.35 -Size 10.5 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $slide -Text 'Tres propuestas de aprendizaje automático' `
    -X 0.64 -Y 1.78 -W 4.35 -H 1.42 -Size 27 -Color $script:Colors.Ink -Bold)
  $description = 'INHALEX es una tienda de aromaterapia donde el cliente explora productos por beneficio, guarda favoritos, compra, publica reseñas y confirma entregas. También integra un panel administrativo y una skill de Alexa.'
  [void](Add-Text -Slide $slide -Text $description -X 0.68 -Y 3.28 -W 4.2 -H 1.32 `
    -Size 14.2 -Color $script:Colors.Muted -VerticalAnchor 1)
  Add-Pill $slide 'Next.js' 0.68 4.79 1.0 0.35 $script:Colors.PaleGreen $script:Colors.Forest 9
  Add-Pill $slide 'NestJS' 1.78 4.79 0.92 0.35 $script:Colors.PaleGreen $script:Colors.Forest 9
  Add-Pill $slide 'MongoDB' 2.8 4.79 1.05 0.35 $script:Colors.PaleGreen $script:Colors.Forest 9
  Add-Pill $slide 'Alexa' 3.95 4.79 0.82 0.35 $script:Colors.PaleGreen $script:Colors.Forest 9
  [void](Add-RoundedBox -Slide $slide -X 5.15 -Y 0.55 -W 7.65 -H 4.92 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Picture -Slide $slide -Path $paths.Screenshot -X 5.27 -Y 0.67 -W 7.41 -H 4.63)
  Add-Pill $slide 'CAPTURA REAL DEL SISTEMA' 5.58 0.84 1.92 0.31 `
    $script:Colors.PaleGreen $script:Colors.Forest 8.3
  [void](Add-RoundedBox -Slide $slide -X 5.15 -Y 5.75 -W 7.65 -H 0.86 `
    -FillColor $script:Colors.Forest -LineColor $script:Colors.Forest)
  [void](Add-Text -Slide $slide -Text 'Del sistema transaccional a decisiones personalizadas, predictivas y accionables.' `
    -X 5.48 -Y 5.88 -W 7.0 -H 0.56 -Size 17 -Color $script:Colors.White -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text 'Integrantes: ______________________________' `
    -X 0.68 -Y 5.65 -W 4.25 -H 0.35 -Size 10.5 -Color $script:Colors.Muted)
  Add-Footer $slide
  Set-SpeakerNotes $slide @'
Nuestro proyecto se llama INHALEX. Es una tienda y sistema web especializado en productos de aromaterapia. El cliente puede explorar aromas según necesidades como relajación, insomnio o vías respiratorias, guardar favoritos, administrar su bolsa, realizar pedidos, publicar reseñas y confirmar la recepción. También existe un panel administrativo para productos, inventario, pedidos, ventas e incidencias, además de una skill de Alexa. A partir de los datos que ya genera el sistema proponemos tres aplicaciones: recomendaciones personalizadas, predicción de demanda y segmentación de clientes.
'@

  # 2. Recomendación con reglas de asociación: fuente -> canastas -> regla
  $slide = $presentation.Slides.Add(2, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  Add-Title $slide 'Propuesta 1 · Recomendación de aroma complementario' `
    'Sistema de recomendación · Reglas de asociación con Apriori' 2
  Add-Pill $slide '1,674 canastas · sin Y' 10.02 0.18 1.83 0.32 `
    $script:Colors.PaleGreen $script:Colors.Forest 8.8
  [void](Add-Text -Slide $slide -Text 'COLECCIÓN MONGODB' -X 0.58 -Y 1.22 `
    -W 3.1 -H 0.3 -Size 10.5 -Color $script:Colors.Blue -Bold -Align 2)
  Add-CollectionCard $slide 'pedidos' @(
    'reference',
    'status',
    'items[].productName'
  ) 0.58 1.55 2.95 1.55
  [void](Add-RoundedBox -Slide $slide -X 0.58 -Y 3.35 -W 2.95 -H 1.52 `
    -FillColor $script:Colors.PaleBlue -LineColor $script:Colors.Blue -LineWeight 0.9)
  [void](Add-Text -Slide $slide -Text 'TRAZABILIDAD DIRECTA' -X 0.78 -Y 3.49 `
    -W 2.55 -H 0.24 -Size 9.2 -Color $script:Colors.Blue -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text "reference  →  TID`nitems[].productName  →  Items`nstatus = completed  →  filtro" `
    -X 0.78 -Y 3.82 -W 2.55 -H 0.78 -Size 9.2 -Color $script:Colors.Ink -Align 2)
  Add-Pill $slide '1 colección · sin datos personales' 0.72 5.15 2.68 0.36 `
    $script:Colors.PaleGreen $script:Colors.Forest 8.8
  Add-FlowArrow $slide "FILTRAR completed`nEXTRAER ITEMS[]`nAGRUPAR POR TID" 3.72 2.72 1.08 1.52
  [void](Add-Text -Slide $slide -Text 'Items = lista construida en Jupyter' `
    -X 3.5 -Y 4.42 -W 1.55 -H 0.6 -Size 8.1 -Color $script:Colors.Muted -Align 2)
  [void](Add-RoundedBox -Slide $slide -X 4.98 -Y 1.36 -W 7.78 -H 5.57 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Text -Slide $slide -Text 'Dataset transaccional · una fila por pedido o canasta' `
    -X 5.22 -Y 1.53 -W 7.25 -H 0.34 -Size 15 -Color $script:Colors.Forest -Bold)
  $recHeaders = @('TID', 'Items')
  $recRows = @(
    ,@('SYN-ORD-000001', 'Toronjil, Jengibre')
    ,@('SYN-ORD-000002', 'Vaporub, Eucalipto')
    ,@('SYN-ORD-000003', 'Vaporub')
    ,@('SYN-ORD-000004', 'Lavanda')
    ,@('SYN-ORD-000005', 'Toronjil, Lavanda')
  )
  [void](Add-DataTable -Slide $slide -Headers $recHeaders -Rows $recRows `
    -ColumnWidths @(2.15, 5.1) `
    -X 5.22 -Y 1.96 -W 7.25 -H 2.13 -HeaderColor $script:Colors.Forest -FontSize 9.1)
  Add-Pill $slide '1,674 canastas' 5.22 4.26 1.48 0.34 $script:Colors.PaleBlue $script:Colors.Blue 9
  Add-Pill $slide '3,003 ítems' 6.84 4.26 1.32 0.34 $script:Colors.PaleBlue $script:Colors.Blue 9
  Add-Pill $slide '16 productos' 8.3 4.26 1.28 0.34 $script:Colors.PaleBlue $script:Colors.Blue 9
  Add-Pill $slide 'SYN = sintético · ORD = pedido' 9.72 4.26 2.38 0.34 `
    $script:Colors.PaleAmber $script:Colors.Amber 8.4
  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 4.82 -W 7.25 -H 1.25 `
    -FillColor $script:Colors.PaleGreen -LineColor $script:Colors.Green -LineWeight 1.1)
  [void](Add-Text -Slide $slide -Text 'APRIORI · APRENDIZAJE NO SUPERVISADO' -X 5.48 -Y 4.94 `
    -W 3.35 -H 0.24 -Size 9.1 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $slide -Text 'X: productos presentes en la canasta   ·   Y: no aplica' `
    -X 8.39 -Y 4.94 -W 3.76 -H 0.24 -Size 9.1 -Color $script:Colors.Forest -Bold -Align 3)
  [void](Add-Text -Slide $slide -Text 'Vaporub  →  Eucalipto' `
    -X 5.48 -Y 5.32 -W 2.55 -H 0.36 -Size 15.5 -Color $script:Colors.Ink -Bold)
  [void](Add-Text -Slide $slide -Text 'Soporte: 3.52 %  ·  Confianza: 26.94 %  ·  Lift: 1.88' `
    -X 8.07 -Y 5.34 -W 4.08 -H 0.3 -Size 9.7 -Color $script:Colors.Ink -Align 3)
  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 6.21 -W 7.25 -H 0.4 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber -LineWeight 0.8)
  [void](Add-Text -Slide $slide -Text 'Aplicación: si la bolsa contiene Vaporub, recomendar Eucalipto como Top-1.' `
    -X 5.42 -Y 6.25 -W 6.85 -H 0.27 -Size 9.5 -Color $script:Colors.Ink -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text 'Resultados calculados sobre datos sintéticos compatibles con la estructura operacional de INHALEX.' `
    -X 5.24 -Y 6.64 -W 7.2 -H 0.18 -Size 7.7 -Color $script:Colors.Coral -Align 2)
  Add-Footer $slide
  Set-SpeakerNotes $slide @'
Esta propuesta es un sistema de recomendación mediante reglas de asociación con Apriori. La única fuente de entrenamiento es la colección pedidos. De cada pedido completado tomamos reference como TID y agrupamos los nombres de items dentro de la columna Items; así obtenemos una fila por canasta. En Jupyter convertimos cada canasta en presencia o ausencia de productos y Apriori descubre cuáles aparecen juntos. No existe variable Y porque es aprendizaje no supervisado: X son los productos presentes en cada compra. Por ejemplo, la regla Vaporub hacia Eucalipto tiene soporte de 3.52 por ciento, confianza de 26.94 por ciento y lift de 1.88. En la bolsa podemos tomar la regla mejor evaluada y recomendar un solo aroma complementario. Los resultados mostrados proceden del conjunto sintético compatible con MongoDB de INHALEX.
'@

  # 3. Mockup de recomendación
  $slide = $presentation.Slides.Add(3, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  Add-Title $slide '¿Dónde se implementaría? · Aromas para ti' 'Catálogo del cliente' 3
  Add-VisualBadge $slide
  [void](Add-RoundedBox -Slide $slide -X 0.55 -Y 1.28 -W 12.22 -H 5.67 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Picture -Slide $slide -Path $paths.Recommendation -X 1.82 -Y 1.4 -W 9.65 -H 5.43)
  [void](Add-RoundedBox -Slide $slide -X 2.47 -Y 2.62 -W 8.36 -H 0.56 `
    -FillColor $script:Colors.White -LineColor $script:Colors.PaleGreen -Transparency 0.08)
  [void](Add-Text -Slide $slide -Text 'Recomendados para ti' -X 2.7 -Y 2.65 `
    -W 2.8 -H 0.26 -Size 17 -Color $script:Colors.Forest -Bold)
  [void](Add-Text -Slide $slide -Text 'Según tus favoritos, compras y afinidad con cada línea' `
    -X 5.35 -Y 2.67 -W 5.0 -H 0.23 -Size 10.5 -Color $script:Colors.Muted)
  Add-Pill $slide 'Lavanda · afinidad 92 %' 2.2 6.08 2.55 0.38 `
    $script:Colors.PaleGreen $script:Colors.Forest 9.2
  Add-Pill $slide 'Manzanilla · combina con Lavanda' 5.2 6.08 2.95 0.38 `
    $script:Colors.PalePurple $script:Colors.Purple 9.2
  Add-Pill $slide 'Toronjil · línea insomnio' 8.63 6.08 2.45 0.38 `
    $script:Colors.PaleAmber $script:Colors.Amber 9.2
  [void](Add-Text -Slide $slide -Text 'Ubicación real propuesta: inicio/catálogo. También puede aparecer en cuenta y responderse mediante Alexa.' `
    -X 1.15 -Y 6.58 -W 11.0 -H 0.24 -Size 9.3 -Color $script:Colors.Ink -Align 2)
  Add-Footer $slide
  Set-SpeakerNotes $slide @'
La recomendación aparecería en el catálogo como una sección llamada “Aromas para ti”. Cada tarjeta explicaría por qué se muestra: porque el usuario guardó productos relajantes o porque otras personas compraron Lavanda junto con Manzanilla. Esta explicación evita que el resultado parezca aleatorio. Al abrir o agregar un producto, la acción retroalimenta el modelo. Para usuarios nuevos se usarían productos populares por categoría. La misma recomendación también podría consultarse mediante Alexa.
'@

  # 4. Regresión de demanda
  $slide = $presentation.Slides.Add(4, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  Add-Title $slide 'Propuesta 2 · Predicción de demanda por producto' `
    'Regresión supervisada · Producto por día' 4
  Add-Pill $slide '8,736 filas producto–día' 9.83 0.52 2.0 0.32 `
    $script:Colors.PalePurple $script:Colors.Purple 8.8
  [void](Add-Text -Slide $slide -Text 'COLECCIONES MONGODB' -X 0.58 -Y 1.22 `
    -W 3.1 -H 0.3 -Size 10.5 -Color $script:Colors.Blue -Bold -Align 2)
  Add-CollectionCard $slide 'pedidos' @('createdAt / status', 'items[].productId', 'requestedQuantity / unitPrice') 0.58 1.55 2.95 1.15
  Add-CollectionCard $slide 'productos' @('category / price', 'stockAvailable', 'promoActive / promoPrice') 0.58 2.82 2.95 1.05
  Add-CollectionCard $slide 'producto_inventario_movimientos' @('productId / type', 'quantity / createdAt') 0.58 3.99 2.95 1.05
  Add-CollectionCard $slide 'reseñas_producto' @('productId / rating', 'createdAt') 0.58 5.16 2.95 1.05
  Add-FlowArrow $slide "DESANIDAR`nAGREGAR POR DÍA`nLAGS / VENTANAS" 3.72 3.02 1.08 1.28
  [void](Add-Text -Slide $slide -Text 'Corte cronológico; nunca aleatorio' `
    -X 3.55 -Y 4.44 -W 1.45 -H 0.65 -Size 8.2 -Color $script:Colors.Muted -Align 2)
  [void](Add-RoundedBox -Slide $slide -X 4.98 -Y 1.36 -W 7.78 -H 5.45 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Text -Slide $slide -Text 'Dataset / DataFrame · una fila por producto y día' `
    -X 5.22 -Y 1.53 -W 7.25 -H 0.34 -Size 15 -Color $script:Colors.Forest -Bold)
  $demHeaders = @('fecha', 'producto', 'lag_7', 'media_7', 'descuento', 'Y: sig. 7 días')
  $demRows = @(
    ,@('2025-07-01', 'Menta', '0', '0.00', '12 %', '5')
    ,@('2025-07-02', 'Lavanda', '1', '0.43', '0 %', '8')
  )
  [void](Add-DataTable -Slide $slide -Headers $demHeaders -Rows $demRows `
    -ColumnWidths @(1.2, 1.15, 0.77, 0.84, 0.9, 1.3) `
    -X 5.22 -Y 1.98 -W 6.16 -H 1.27 -HeaderColor $script:Colors.Forest `
    -LastColumnColor $script:Colors.PalePurple -FontSize 8.4)
  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 3.53 -W 3.45 -H 1.5 `
    -FillColor $script:Colors.PaleGreen -LineColor $script:Colors.Green)
  [void](Add-Text -Slide $slide -Text 'VARIABLES X' -X 5.45 -Y 3.68 -W 1.3 -H 0.25 `
    -Size 9.2 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $slide -Text "Lags 1/7/14/28 · medias 7/28`nprecio y promoción · calendario`nrating acumulado · interés observado" `
    -X 5.42 -Y 3.96 -W 3.0 -H 0.82 -Size 10.2 -Color $script:Colors.Ink -VerticalAnchor 1)
  [void](Add-RoundedBox -Slide $slide -X 8.9 -Y 3.53 -W 3.55 -H 1.5 `
    -FillColor $script:Colors.PalePurple -LineColor $script:Colors.Purple)
  [void](Add-Text -Slide $slide -Text 'VARIABLE Y' -X 9.13 -Y 3.68 -W 1.3 -H 0.25 `
    -Size 9.2 -Color $script:Colors.Purple -Bold)
  [void](Add-Text -Slide $slide -Text 'target_requested_units_next_7d' `
    -X 9.1 -Y 4.01 -W 3.0 -H 0.35 -Size 12 -Color $script:Colors.Ink -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text 'Valor continuo: unidades solicitadas durante la próxima semana.' `
    -X 9.12 -Y 4.39 -W 3.0 -H 0.4 -Size 9.5 -Color $script:Colors.Muted -Align 2)
  Add-Pill $slide '16 productos × 546 días' 5.22 5.36 1.88 0.34 `
    $script:Colors.PaleBlue $script:Colors.Blue 8.8
  Add-Pill $slide '8,624 filas entrenables' 7.28 5.36 1.9 0.34 `
    $script:Colors.PaleBlue $script:Colors.Blue 8.8
  Add-Pill $slide 'Y: 0–26 unidades' 9.36 5.36 1.55 0.34 `
    $script:Colors.PaleBlue $script:Colors.Blue 8.8
  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 5.92 -W 7.23 -H 0.62 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber)
  [void](Add-Text -Slide $slide -Text 'UTILIDAD · anticipar reabastecimiento y reducir faltantes o sobreinventario.' `
    -X 5.48 -Y 6.04 -W 6.7 -H 0.34 -Size 12.2 -Color $script:Colors.Ink -Bold -Align 2)
  Add-Footer $slide
  Set-SpeakerNotes $slide @'
La segunda propuesta es una regresión de demanda. La unidad de análisis es un producto en un día. De pedidos extraemos las cantidades solicitadas, incluso si después existe cancelación, porque demanda no es lo mismo que venta satisfecha. Productos aporta categoría, precio y existencias; los movimientos permiten reconstruir inventario; y las reseñas aportan reputación acumulada. Agrupamos por producto y fecha, completamos días sin pedidos y calculamos rezagos y promedios móviles usando solo el pasado. La variable Y es el total solicitado durante la siguiente semana. La evaluación debe ser cronológica y puede usar MAE y RMSE.
'@

  # 5. Mockup demanda
  $slide = $presentation.Slides.Add(5, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  Add-Title $slide '¿Dónde se implementaría? · Pronóstico de inventario' `
    'Panel administrativo · Ventas e inventario' 5
  Add-VisualBadge $slide
  [void](Add-RoundedBox -Slide $slide -X 0.55 -Y 1.28 -W 12.22 -H 5.67 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Picture -Slide $slide -Path $paths.Demand -X 1.82 -Y 1.4 -W 9.65 -H 5.43)
  [void](Add-RoundedBox -Slide $slide -X 3.1 -Y 1.58 -W 7.85 -H 1.05 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Green -Transparency 0.02)
  [void](Add-Text -Slide $slide -Text 'Lavanda · pronóstico próximos 7 días' `
    -X 3.3 -Y 1.7 -W 2.8 -H 0.3 -Size 13.2 -Color $script:Colors.Forest -Bold)
  Add-Pill $slide 'Demanda: 18 unidades' 6.15 1.69 1.72 0.36 `
    $script:Colors.PaleGreen $script:Colors.Forest 9
  Add-Pill $slide 'Stock: 7' 8.0 1.69 1.0 0.36 `
    $script:Colors.PaleAmber $script:Colors.Amber 9
  Add-Pill $slide 'Reabasto sugerido: 11+' 9.13 1.69 1.65 0.36 `
    $script:Colors.PaleCoral $script:Colors.Coral 9
  [void](Add-Text -Slide $slide -Text 'Histórico ━━━    Pronóstico ┅┅┅    Banda de incertidumbre' `
    -X 5.15 -Y 2.17 -W 5.2 -H 0.24 -Size 9 -Color $script:Colors.Muted -Align 2)
  Add-Pill $slide 'ALTO · Lavanda' 8.35 6.18 1.38 0.34 `
    $script:Colors.PaleCoral $script:Colors.Coral 8.8
  Add-Pill $slide 'MEDIO · Manzanilla' 9.88 6.18 1.65 0.34 `
    $script:Colors.PaleAmber $script:Colors.Amber 8.8
  [void](Add-Text -Slide $slide -Text 'El administrador conserva la decisión final; el modelo funciona como apoyo.' `
    -X 2.15 -Y 6.51 -W 9.5 -H 0.24 -Size 9.2 -Color $script:Colors.Ink -Align 2)
  Add-Footer $slide 'INHALEX · Diseño conceptual; valores ilustrativos'
  Set-SpeakerNotes $slide @'
El pronóstico se integraría en el módulo administrativo de ventas e inventario. Para cada producto mostraríamos demanda esperada, existencias actuales y una sugerencia de reabasto. La gráfica separa el histórico de la línea pronosticada y puede incluir una banda de incertidumbre. Si la demanda supera el stock más un margen de seguridad, se genera una alerta. El administrador conserva la decisión final. Por ejemplo, para Lavanda se esperan 18 unidades, hay 7 disponibles y se sugiere reabastecer al menos 11 más un margen de seguridad.
'@

  # 6. Clustering
  $slide = $presentation.Slides.Add(6, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  Add-Title $slide 'Propuesta 3 · Segmentación de clientes' `
    'Clustering · Aprendizaje no supervisado' 6
  Add-Pill $slide '300 clientes · sin Y' 10.25 0.52 1.55 0.32 `
    $script:Colors.PaleAmber $script:Colors.Amber 8.8
  [void](Add-Text -Slide $slide -Text 'COLECCIONES MONGODB' -X 0.58 -Y 1.22 `
    -W 3.1 -H 0.3 -Size 10.5 -Color $script:Colors.Blue -Bold -Align 2)
  Add-CollectionCard $slide 'usuarios' @('_id / createdAt', 'favoriteProductIds[]', 'cartItems[]') 0.58 1.55 2.95 1.15
  Add-CollectionCard $slide 'pedidos' @('customerUserId', 'status / subtotal / createdAt', 'items[].productId') 0.58 2.82 2.95 1.15
  Add-CollectionCard $slide 'reseñas_producto' @('userId / productId', 'rating') 0.58 4.09 2.95 1.0
  Add-CollectionCard $slide 'productos' @('_id / category') 0.58 5.21 2.95 0.9
  Add-FlowArrow $slide "AGRUPAR`nRFM / AFINIDAD`nESCALAR" 3.72 3.02 1.08 1.28
  [void](Add-Text -Slide $slide -Text 'Una fotografía por cliente al 30/06/2026' `
    -X 3.55 -Y 4.44 -W 1.45 -H 0.65 -Size 8.2 -Color $script:Colors.Muted -Align 2)
  [void](Add-RoundedBox -Slide $slide -X 4.98 -Y 1.36 -W 7.78 -H 5.45 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Text -Slide $slide -Text 'Dataset · una fila por cliente comprador' `
    -X 5.22 -Y 1.53 -W 7.25 -H 0.34 -Size 15 -Color $script:Colors.Forest -Bold)
  $segHeaders = @('cliente', 'recencia', 'frecuencia', 'monto', 'favoritos', 'preferencia')
  $segRows = @(
    ,@('SYN-CUST-0009', '41 días', '7', '$588', '1', 'resfriado')
    ,@('SYN-CUST-0152', '8 días', '14', '$1,764', '3', 'insomnio')
  )
  [void](Add-DataTable -Slide $slide -Headers $segHeaders -Rows $segRows `
    -ColumnWidths @(1.35, 1.0, 0.9, 0.9, 0.9, 1.2) `
    -X 5.22 -Y 1.98 -W 6.25 -H 1.27 -HeaderColor $script:Colors.Forest -FontSize 8.4)
  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 3.5 -W 7.23 -H 0.88 `
    -FillColor $script:Colors.PaleGreen -LineColor $script:Colors.Green)
  [void](Add-Text -Slide $slide -Text 'VARIABLES X · RFM + conducta' `
    -X 5.46 -Y 3.61 -W 2.5 -H 0.25 -Size 10 -Color $script:Colors.Green -Bold)
  [void](Add-Text -Slide $slide -Text 'recency · frequency · monetary · ticket · diversidad · favoritos · reseñas · afinidad por línea' `
    -X 5.44 -Y 3.9 -W 6.72 -H 0.27 -Size 9.8 -Color $script:Colors.Ink)
  Add-Pill $slide 'Leales / alto valor' 5.22 4.72 1.68 0.38 `
    $script:Colors.PaleGreen $script:Colors.Forest 9.2
  Add-Pill $slide 'Nuevos / prometedores' 7.05 4.72 1.9 0.38 `
    $script:Colors.PaleBlue $script:Colors.Blue 9.2
  Add-Pill $slide 'Ocasionales / promoción' 9.1 4.72 2.0 0.38 `
    $script:Colors.PalePurple $script:Colors.Purple 9.2
  Add-Pill $slide 'En riesgo' 11.25 4.72 1.02 0.38 `
    $script:Colors.PaleCoral $script:Colors.Coral 9.2
  [void](Add-RoundedBox -Slide $slide -X 5.22 -Y 5.39 -W 7.23 -H 0.78 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber)
  [void](Add-Text -Slide $slide -Text 'SIN VARIABLE Y · los grupos se descubren y se interpretan después; no son clases preasignadas.' `
    -X 5.46 -Y 5.53 -W 6.73 -H 0.43 -Size 11.2 -Color $script:Colors.Ink -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text 'K=2 obtuvo el mejor silhouette preliminar; K=4 ofrece perfiles comerciales más accionables y debe validarse.' `
    -X 5.24 -Y 6.31 -W 7.2 -H 0.3 -Size 8.8 -Color $script:Colors.Muted)
  Add-Footer $slide
  Set-SpeakerNotes $slide @'
La tercera propuesta es clustering; por eso no existe una variable Y ni clases conocidas. Construimos una fotografía por cliente. De pedidos calculamos recencia, frecuencia, monto, unidades y diversidad; de usuarios, favoritos y antigüedad; de reseñas, actividad y calificación; y de productos, afinidad por línea. No usamos nombre, correo, teléfono ni dirección. Aplicamos log1p, imputación y escalado antes de K-Means. El número de grupos se compara con silhouette y estabilidad; los nombres comerciales se asignan después de interpretar los centroides. Los cuatro perfiles son hipótesis, no etiquetas verdaderas.
'@

  # 7. Mockup clustering
  $slide = $presentation.Slides.Add(7, 12)
  Set-SlideBackground $slide $script:Colors.Cream
  Add-Title $slide '¿Dónde se implementaría? · Segmentos de clientes' `
    'Panel administrativo · Usuarios y promociones' 7
  Add-VisualBadge $slide
  [void](Add-RoundedBox -Slide $slide -X 0.55 -Y 1.28 -W 12.22 -H 5.67 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Border -Shadow)
  [void](Add-Picture -Slide $slide -Path $paths.Segmentation -X 1.82 -Y 1.4 -W 9.65 -H 5.43)
  Add-Pill $slide 'Leales · 77' 3.47 1.93 1.35 0.34 `
    $script:Colors.PaleGreen $script:Colors.Forest 9
  Add-Pill $slide 'Nuevos · 62' 5.7 1.93 1.35 0.34 `
    $script:Colors.PaleBlue $script:Colors.Blue 9
  Add-Pill $slide 'Ocasionales · 104' 7.91 1.93 1.62 0.34 `
    $script:Colors.PalePurple $script:Colors.Purple 9
  Add-Pill $slide 'En riesgo · 57' 10.13 1.93 1.22 0.34 `
    $script:Colors.PaleAmber $script:Colors.Amber 9
  Add-Pill $slide '25.7 %' 8.54 3.59 0.58 0.25 `
    $script:Colors.White $script:Colors.Forest 7.6 $script:Colors.White
  Add-Pill $slide '20.7 %' 8.54 3.86 0.58 0.25 `
    $script:Colors.White $script:Colors.Mint 7.6 $script:Colors.White
  Add-Pill $slide '34.7 %' 8.54 4.13 0.58 0.25 `
    $script:Colors.White $script:Colors.Purple 7.6 $script:Colors.White
  Add-Pill $slide '19.0 %' 8.54 4.4 0.58 0.25 `
    $script:Colors.White $script:Colors.Amber 7.6 $script:Colors.White
  [void](Add-RoundedBox -Slide $slide -X 9.07 -Y 5.15 -W 2.18 -H 1.12 `
    -FillColor $script:Colors.White -LineColor $script:Colors.Green -Transparency 0.04)
  [void](Add-Text -Slide $slide -Text 'Acciones por segmento' -X 9.26 -Y 5.26 `
    -W 1.82 -H 0.25 -Size 10.3 -Color $script:Colors.Forest -Bold -Align 2)
  [void](Add-Text -Slide $slide -Text "Ver clientes`nCrear promoción dirigida" -X 9.26 -Y 5.56 `
    -W 1.82 -H 0.5 -Size 9.3 -Color $script:Colors.Ink -Align 2)
  [void](Add-Text -Slide $slide -Text 'K=4 preliminar · uso interno · segmentación conductual · actualización periódica' `
    -X 2.15 -Y 6.55 -W 9.5 -H 0.22 -Size 9.1 -Color $script:Colors.Ink -Align 2)
  Add-Footer $slide
  Set-SpeakerNotes $slide @'
Los segmentos aparecerían únicamente en el panel administrativo, dentro de usuarios y promociones. El administrador vería el tamaño y características de cada grupo, podría filtrar por línea preferida y preparar una acción apropiada: bienvenida para nuevos, acceso anticipado para leales o reactivación para clientes en riesgo. La segmentación se recalcularía periódicamente porque una persona puede cambiar de grupo. Usamos únicamente comportamiento dentro del sistema y no datos sensibles; el propósito es evitar promociones genéricas, no excluir clientes.
'@

  $pptxPath = Join-Path $output "$BaseName.pptx"
  $pdfPath = Join-Path $output "$BaseName.pdf"
  $presentation.SaveAs($pptxPath, 24)
  $presentation.SaveAs($pdfPath, 32)
  $presentation.Export($previewDirectory, 'PNG', 1600, 900)

  [pscustomobject]@{
    pptx = $pptxPath
    pdf = $pdfPath
    preview = $previewDirectory
    slides = $presentation.Slides.Count
  } | ConvertTo-Json -Compress
}
finally {
  if ($null -ne $presentation) {
    try { $presentation.Saved = -1 } catch {}
    try { $presentation.Close() } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  }
  if ($null -ne $powerPoint) {
    try { $powerPoint.Quit() } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
