# Generador de Etiquetas con SKU Genérico

## Resumen
Botón en la pestaña Stock que abre un modal para seleccionar productos sin SKU (como rines) y generar etiquetas imprimibles con SKU auto-generado + código de barras decorativo + logo de la empresa.

## Archivo a modificar
- `src/components/Inventory.jsx`

## UI / Flujo

### Botón en header
`[📄 Reporte] [🏷️ Etiquetas] [Nuevo +] [📥 Importar CSV]`
- Color: violeta (`bg-violet-600 hover:bg-violet-700`)
- Solo admin

### Modal
- Header con logo + "Generar Etiquetas"
- Buscador filtra productos en tiempo real
- Lista con checkboxes: nombre, marca, SKU, stock
- Input cantidad de etiquetas por producto
- Botones: Cancelar + Generar e Imprimir

## Lógica SKU

| Tipo | Prefijo | Formato |
|------|---------|---------|
| `warehouse === "rines"` | `RIN-` | RIN-00001 |
| `warehouse === "llantas"` | `LLA-` | LLA-00001 |
| Otros | `PROD-` | PROD-00001 |

5 dígitos padding. Consulta último SKU con prefijo en DB, incrementa, guarda.

## Etiqueta (~60×35mm, 3×8 por hoja)
- Logo VULC. NANDO
- Nombre producto
- Código barras SVG + SKU
- Precio

## Técnico
- `window.open` + HTML inline (patrón Quotes/Warehouses)
- SVG decorativo para barcode
- Auto-print en onload
- Logo: `/images/logo_nando.jpg`
