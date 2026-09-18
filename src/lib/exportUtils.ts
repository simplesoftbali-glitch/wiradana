import * as XLSX from 'xlsx'

interface ExportSheet {
  sheetName: string
  data: Array<Record<string, unknown>>
}

export function exportToExcel(filename: string, sheets: ExportSheet[]) {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ sheetName, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  })

  const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '-')
  XLSX.writeFile(workbook, safeFilename.endsWith('.xlsx') ? safeFilename : `${safeFilename}.xlsx`)
}
