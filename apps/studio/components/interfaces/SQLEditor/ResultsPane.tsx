import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui'
import { formatCellValue, isRichTextColumn } from './utils'

interface ResultsPaneProps {
  results: {
    columns: Array<{ name: string; type: string }>
    rows: Array<Record<string, unknown>>
  }
  onCellClick?: (row: number, col: string) => void
}

export function ResultsPane({ results, onCellClick }: ResultsPaneProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null)

  const formattedRows = useMemo(() => {
    return results.rows.map((row, rowIndex) => {
      const formattedRow: Record<string, { value: string; isRichText: boolean }> = {}
      results.columns.forEach((col) => {
        const cellValue = row[col.name]
        formattedRow[col.name] = {
          value: formatCellValue(cellValue, col.type),
          isRichText: isRichTextColumn(col.type)
        }
      })
      return formattedRow
    })
  }, [results])

  const handleCellClick = (rowIndex: number, colName: string) => {
    setSelectedCell({ row: rowIndex, col: colName })
    onCellClick?.(rowIndex, colName)
  }

  const renderCellContent = (cell: { value: string; isRichText: boolean }, colName: string) => {
    if (cell.isRichText) {
      return (
        <span
          className="cell-content rich-text"
          dangerouslySetInnerHTML={{ __html: cell.value }}
        />
      )
    }
    return <span className="cell-content">{cell.value}</span>
  }

  return (
    <div className="results-pane overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            {results.columns.map((col) => (
              <TableHead key={col.name} className="font-mono text-xs">
                {col.name}
                <span className="ml-2 text-foreground-lighter">({col.type})</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {formattedRows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {results.columns.map((col) => (
                <TableCell
                  key={`${rowIndex}-${col.name}`}
                  className={`font-mono text-xs cursor-pointer hover:bg-surface-200 ${
                    selectedCell?.row === rowIndex && selectedCell?.col === col.name
                      ? 'bg-surface-300'
                      : ''
                  }`}
                  onClick={() => handleCellClick(rowIndex, col.name)}
                >
                  {renderCellContent(row[col.name], col.name)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
