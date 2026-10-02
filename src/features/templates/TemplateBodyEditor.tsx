import { useEffect, useMemo, useRef, useState } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  GeneralHtmlSupport,
  Heading,
  Italic,
  Link,
  List,
  Paragraph,
  SourceEditing,
  Strikethrough,
  Underline,
  type Editor,
} from 'ckeditor5'
import esTranslations from 'ckeditor5/translations/es.js'
import 'ckeditor5/ckeditor5.css'
import { cn } from '@/shared/lib/cn'
import fieldStyles from '@/shared/ui/Field.module.css'
import styles from './TemplateBodyEditor.module.css'

/* Editor CKEditor 5 para el body de la plantilla: negrita, cursiva, títulos,
 * listas, enlaces, alineación, modo fuente HTML y variables {{...}}. */
export function TemplateBodyEditor({
  value,
  onChange,
  label = 'Body (HTML o texto)',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [customVar, setCustomVar] = useState('')
  const editorRef = useRef<Editor | null>(null)

  // Variables acordes al texto: se detectan desde el propio body ({{nombre}}),
  // sin lista quemada. Sirven para reinsertarlas en el cursor.
  const detectedVars = useMemo(() => {
    const found: string[] = []
    const re = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(value)) !== null) {
      const name = m[1]
      if (!found.includes(name)) found.push(name)
    }
    return found
  }, [value])

  // Sincroniza cambios externos (p. ej. Clonar) dentro del editor.
  useEffect(() => {
    const ed = editorRef.current as unknown as {
      getData: () => string
      setData: (d: string) => void
    } | null
    if (ed && ed.getData() !== value) ed.setData(value)
  }, [value])

  function insertVar(name: string) {
    const v = name.trim().replace(/[{}\s]/g, '')
    if (!v) return
    const ed = editorRef.current
    if (!ed) {
      onChange(`${value}{{${v}}}`)
      return
    }
    ed.editing.view.focus()
    ed.model.change((writer) => {
      const pos = ed.model.document.selection.getFirstPosition()
      if (pos) writer.insertText(`{{${v}}}`, pos)
    })
  }

  return (
    <div className={fieldStyles.wrap}>
      <span className={fieldStyles.label}>{label}</span>
      <div className={styles.editor}>
        <div className={styles.tabs} role="tablist" aria-label="Modo de edición">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'write'}
            className={cn(styles.tab, view === 'write' && styles.tabActive)}
            onClick={() => setView('write')}
          >
            Escribir
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'preview'}
            className={cn(styles.tab, view === 'preview' && styles.tabActive)}
            onClick={() => setView('preview')}
          >
            Vista previa
          </button>
        </div>

        {view === 'write' ? (
          <CKEditor
            editor={ClassicEditor}
            data={value}
            config={{
              language: 'es',
              translations: [esTranslations],
              licenseKey: 'GPL',
              plugins: [
                Essentials,
                Paragraph,
                Heading,
                Bold,
                Italic,
                Underline,
                Strikethrough,
                List,
                Link,
                BlockQuote,
                Alignment,
                SourceEditing,
                GeneralHtmlSupport,
              ],
              toolbar: [
                'undo',
                'redo',
                '|',
                'heading',
                '|',
                'bold',
                'italic',
                'underline',
                'strikethrough',
                '|',
                'link',
                'bulletedList',
                'numberedList',
                '|',
                'alignment',
                'blockQuote',
                '|',
                'sourceEditing',
              ],
              heading: {
                options: [
                  { model: 'paragraph', title: 'Párrafo', class: 'ck-heading_paragraph' },
                  { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
                  { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
                  { model: 'heading3', view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' },
                ],
              },
              htmlSupport: {
                allow: [{ name: /.*/, attributes: true, classes: true, styles: true }],
              },
            }}
            onReady={(editor) => {
              editorRef.current = editor as unknown as Editor
            }}
            onChange={(_event, editor) => {
              const data = (editor as unknown as { getData: () => string }).getData()
              if (data !== value) onChange(data)
            }}
          />
        ) : (
          <div
            className={styles.preview}
            // Vista previa local del HTML de la propia plantilla (solo admin).
            dangerouslySetInnerHTML={{ __html: value || '<em>(vacío)</em>' }}
          />
        )}

        <div className={styles.vars}>
          <span className={styles.varsLabel}>
            {detectedVars.length ? 'Variables en el texto:' : 'Sin variables: escribe {{nombre}} en el texto o agrégala aquí:'}
          </span>
          {detectedVars.map((v) => (
            <button key={v} type="button" className={styles.chip} title="Insertar de nuevo" onClick={() => insertVar(v)}>
              {`{{${v}}}`}
            </button>
          ))}
          <input
            className={styles.varInput}
            value={customVar}
            onChange={(e) => setCustomVar(e.target.value)}
            placeholder="nueva_variable"
            aria-label="Nueva variable"
          />
          <button
            type="button"
            className={styles.chip}
            onClick={() => {
              insertVar(customVar)
              setCustomVar('')
            }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
