import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Export data ke CSV format
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Nama file untuk didownload
 * @param {Array} headers - Array of column headers (opsional, auto dari keys jika tidak ada)
 */
export function exportToCSV(data, filename = 'export.csv', headers = null) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor')
    return
  }

  // Get headers dari data keys jika tidak disediakan
  const columnHeaders = headers || Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Header row
    columnHeaders.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
    // Data rows
    ...data.map((row) =>
      columnHeaders
        .map((header) => {
          const value = row[header]
          // Escape quotes dan wrap dalam quotes
          const stringValue = String(value || '')
          return `"${stringValue.replace(/"/g, '""')}"`
        })
        .join(',')
    )
  ].join('\n')

  // Create blob dan trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Export HTML table ke PDF
 * @param {String} elementId - ID dari element yang akan di-export
 * @param {String} filename - Nama file untuk didownload
 * @param {String} title - Title dari dokumen PDF
 */
export async function exportTableToPDF(elementId, filename = 'export.pdf', title = 'Laporan') {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      alert('Tidak dapat menemukan element untuk diekspor')
      return
    }

    // Capture element sebagai canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 297 - 20 // A4 landscape width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageHeight = 210 - 20 // A4 height minus margins

    let heightLeft = imgHeight
    let position = 10

    // Add title
    pdf.setFontSize(14)
    pdf.text(title, 10, 8)

    // Add image
    pdf.addImage(imgData, 'PNG', 10, position + 5, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add new pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Download PDF
    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Gagal mengekspor PDF: ' + error.message)
  }
}

/**
 * Export data ke PDF dengan format table
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions: [{header, dataKey}, ...]
 * @param {String} filename - Nama file untuk didownload
 * @param {String} title - Title dari dokumen PDF
 */
export function exportDataToPDF(data, columns, filename = 'export.pdf', title = 'Laporan') {
  try {
    if (!data || data.length === 0) {
      alert('Tidak ada data untuk diekspor')
      return
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Add title
    pdf.setFontSize(14)
    pdf.text(title, 14, 10)
    pdf.setFontSize(10)

    // Prepare table data
    const tableColumns = columns.map((col) => col.header)
    const tableRows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.dataKey]
        // Format values
        if (typeof value === 'number') {
          return value.toLocaleString('id-ID')
        }
        return value || '-'
      })
    )

    // Add table
    pdf.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 20,
      margin: { top: 20, right: 10, bottom: 10, left: 10 },
      headerStyles: {
        fillColor: [71, 85, 105], // slate-700
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        textColor: 50,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      didDrawPage: (data) => {
        // Footer
        const pageCount = pdf.getNumberOfPages()
        const pageSize = pdf.internal.pageSize
        const pageHeight = pageSize.getHeight()
        const pageWidth = pageSize.getWidth()

        pdf.setFontSize(8)
        pdf.text(`Halaman ${data.pageNumber}/${pageCount}`, pageWidth - 30, pageHeight - 10)
        pdf.text(new Date().toLocaleDateString('id-ID'), 14, pageHeight - 10)
      }
    })

    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Gagal mengekspor PDF: ' + error.message)
  }
}

/**
 * Helper function untuk download blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format rupiah untuk CSV/PDF export
 */
export function formatRupiahForExport(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

/**
 * Format datetime untuk CSV/PDF export
 */
export function formatDateTimeForExport(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
