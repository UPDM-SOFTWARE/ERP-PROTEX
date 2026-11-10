import React, { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer, PDFDownloadLink, Image as PdfImage, pdf, Font } from '@react-pdf/renderer';
import { Plus, Trash2, Upload, Download, FileText, Eye, Settings, ImageIcon, CheckCircle2, LayoutTemplate, ArrowRight, FolderLock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '../../context/FinanceContext';
import { useActivity, ACTIVITY_TYPES } from '../../context/ActivityContext';

import LogoCarribean from '../../assets/carribeanenergysolutionslogo.png';
import LogoInfiniguard from '../../assets/infiniguardlogo.png';
import LogoProtex from '../../assets/protexlogo.png';

// --- HYPHENATION ---
// Evita que react-pdf corte palabras con guiones ("in-dustrial").
// Solo parte palabras extremadamente largas (URLs, códigos) para que no se salgan de la columna.
Font.registerHyphenationCallback((word) => {
  if (word.length <= 24) return [word];
  const chunks = [];
  for (let i = 0; i < word.length; i += 12) chunks.push(word.slice(i, i + 12));
  return chunks;
});

// --- STANDARD STYLES ---
// Diseñado para soportar contenido largo: el footer es fijo con espacio reservado,
// las filas cortas no se parten entre páginas y los totales siempre quedan juntos.
const PAGE_H_PADDING = 40;
const FOOTER_SPACE = 70;

const stdStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: FOOTER_SPACE,
    paddingHorizontal: PAGE_H_PADDING,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  logoSection: { width: '58%', paddingRight: 16 },
  logo: { width: 95, maxHeight: 95, objectFit: 'contain', marginBottom: 12 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6, lineHeight: 1.2 },
  companyDetails: { fontSize: 9.5, color: '#4b5563', lineHeight: 1.5 },
  invoiceTitleSection: { width: '42%', alignItems: 'flex-end' },
  title: { fontSize: 30, fontWeight: 'bold', color: '#111827', letterSpacing: 1, marginBottom: 12 },
  invoiceMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: 5, width: '100%' },
  metaLabel: { fontSize: 9, color: '#6b7280', width: 70, textAlign: 'right', paddingRight: 10, paddingTop: 1 },
  metaValueWrap: { flexDirection: 'column', alignItems: 'flex-end', maxWidth: 140 },
  metaValue: { fontSize: 10, color: '#111827', fontWeight: 'bold', textAlign: 'right' },
  metaSubtext: { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 2 },

  billToSection: { marginBottom: 28 },
  billToLabel: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  clientName: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 4, lineHeight: 1.3 },
  clientDetails: { fontSize: 9.5, color: '#4b5563', lineHeight: 1.5 },
  attnLabel: { fontSize: 9.5, color: '#111827', fontWeight: 'bold' },
  attnValue: { fontSize: 9.5, color: '#111827', marginTop: 2, lineHeight: 1.4 },

  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  thDesc: { width: '52%', fontSize: 9.5, fontWeight: 'bold', color: '#374151', paddingRight: 10 },
  thQty: { width: '12%', fontSize: 9.5, fontWeight: 'bold', color: '#374151', textAlign: 'center' },
  thPrice: { width: '18%', fontSize: 9.5, fontWeight: 'bold', color: '#374151', textAlign: 'right' },
  thTotal: { width: '18%', fontSize: 9.5, fontWeight: 'bold', color: '#374151', textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tdDesc: { width: '52%', fontSize: 9.5, color: '#111827', lineHeight: 1.4, paddingRight: 10 },
  tdQtyWrap: { width: '12%', alignItems: 'center' },
  tdQty: { fontSize: 9.5, color: '#4b5563', textAlign: 'center' },
  tdUnit: { fontSize: 7.5, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
  tdPrice: { width: '18%', fontSize: 9.5, color: '#4b5563', textAlign: 'right' },
  tdTotal: { width: '18%', fontSize: 9.5, color: '#111827', textAlign: 'right', fontWeight: 'bold' },

  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  totalsBlock: { width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 9.5, color: '#6b7280' },
  totalValue: { fontSize: 9.5, color: '#111827' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
  grandTotalValue: { fontSize: 12, fontWeight: 'bold', color: '#10b981' },

  notesSection: { marginTop: 24 },
  notesTitle: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  notesText: { fontSize: 9.5, color: '#374151', lineHeight: 1.5 },

  footer: { position: 'absolute', bottom: 25, left: PAGE_H_PADDING, right: PAGE_H_PADDING, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8.5, color: '#9ca3af', textAlign: 'center', flex: 1 },
  pageNumber: { fontSize: 8, color: '#9ca3af', width: 60, textAlign: 'right' },
  footerSpacer: { width: 60 }
});

// --- INFINIGUARD STYLES ---
const infStyles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 75, paddingHorizontal: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  logoSection: { width: '55%' },
  logo: { width: 140, maxHeight: 90, objectFit: 'contain', marginBottom: 10 },
  companyName: { fontSize: 10, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  companyDetails: { fontSize: 9, color: '#333', lineHeight: 1.4 },
  tagline: { fontSize: 9, color: '#333', marginTop: 15, marginBottom: 20 },
  invoiceTitleSection: { width: '45%', alignItems: 'flex-end' },
  title: { fontSize: 32, color: '#111', marginBottom: 5, letterSpacing: 0.5 },
  invNumber: { fontSize: 10, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  balanceLabelTitle: { fontSize: 9, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  balanceAmountTitle: { fontSize: 14, fontWeight: 'bold', color: '#111' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  billToBlock: { width: '30%' },
  shipToBlock: { width: '30%' },
  billToLabel: { fontSize: 10, color: '#333', marginBottom: 4 },
  clientName: { fontSize: 10, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  clientDetails: { fontSize: 9, color: '#333', lineHeight: 1.4 },

  metaBlock: { width: '40%', alignItems: 'flex-end', justifyContent: 'flex-end' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  metaLabel: { fontSize: 9, color: '#333', width: 90, textAlign: 'right', paddingRight: 5 },
  metaValue: { fontSize: 9, color: '#111', width: 80, textAlign: 'right' },

  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 4 },
  thHash: { width: '5%', fontSize: 9, color: '#fff', textAlign: 'center' },
  thDesc: { width: '50%', fontSize: 9, color: '#fff' },
  thQty: { width: '15%', fontSize: 9, color: '#fff', textAlign: 'right' },
  thRate: { width: '15%', fontSize: 9, color: '#fff', textAlign: 'right' },
  thAmount: { width: '15%', fontSize: 9, color: '#fff', textAlign: 'right' },

  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tdHash: { width: '5%', fontSize: 9, color: '#333', textAlign: 'center' },
  tdDesc: { width: '50%', fontSize: 9, color: '#333', lineHeight: 1.4 },
  tdQty: { width: '15%', fontSize: 9, color: '#333', textAlign: 'right' },
  tdRate: { width: '15%', fontSize: 9, color: '#333', textAlign: 'right' },
  tdAmount: { width: '15%', fontSize: 9, color: '#333', textAlign: 'right' },

  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, marginBottom: 30 },
  totalsBlock: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 5 },
  totalLabel: { fontSize: 9, color: '#333' },
  totalValue: { fontSize: 9, color: '#111' },
  totalRowBold: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 5 },
  totalLabelBold: { fontSize: 9, fontWeight: 'bold', color: '#111' },
  totalValueBold: { fontSize: 9, fontWeight: 'bold', color: '#111' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 5, backgroundColor: '#f3f4f6' },

  bottomSection: { flexDirection: 'column', gap: 10 },
  notesTitle: { fontSize: 10, color: '#333', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#333', lineHeight: 1.4 },

  termsSection: { position: 'absolute', bottom: 25, left: 40, right: 40 },
  termsTitle: { fontSize: 10, color: '#333', marginBottom: 4 },
  termsText: { fontSize: 9, color: '#333' }
});


// --- FORMAT HELPER ---
const formatCurrency = (amount) => (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Notas cortas van en el footer (como "Thank you for your business.").
// Notas largas o multilínea van en el cuerpo para que nunca se encimen con el contenido.
const isShortNote = (text) => !!text && text.length <= 90 && !text.includes('\n');

// --- STANDARD TEMPLATE COMPONENT ---
const StandardTemplate = ({ data, subtotal, taxAmount, total }) => {
  const notes = (data.notes || '').trim();
  const footerNote = notes ? (isShortNote(notes) ? notes : 'Thank you for your business.') : 'Thank you for your business.';
  const bodyNote = notes && !isShortNote(notes) ? notes : null;

  return (
    <Page size="A4" style={stdStyles.page}>
      {/* HEADER */}
      <View style={stdStyles.header}>
        <View style={stdStyles.logoSection}>
          {data.logo && <PdfImage src={data.logo} style={stdStyles.logo} />}
          <Text style={stdStyles.companyName}>{data.companyName || 'Your Company'}</Text>
          {!!data.companyAddress && <Text style={stdStyles.companyDetails}>{data.companyAddress}</Text>}
          {!!data.companyEmail && <Text style={stdStyles.companyDetails}>{data.companyEmail}</Text>}
          {!!data.companyPhone && <Text style={stdStyles.companyDetails}>{data.companyPhone}</Text>}
        </View>
        <View style={stdStyles.invoiceTitleSection}>
          <Text style={stdStyles.title}>INVOICE</Text>
          <View style={stdStyles.invoiceMeta}>
            <Text style={stdStyles.metaLabel}>INVOICE #:</Text>
            <View style={stdStyles.metaValueWrap}>
              <Text style={stdStyles.metaValue}>{data.invoiceNumber || '---'}</Text>
            </View>
          </View>
          <View style={stdStyles.invoiceMeta}>
            <Text style={stdStyles.metaLabel}>DATE:</Text>
            <View style={stdStyles.metaValueWrap}>
              <Text style={stdStyles.metaValue}>{data.date || '---'}</Text>
              {!!data.dateSubtext && <Text style={stdStyles.metaSubtext}>{data.dateSubtext}</Text>}
            </View>
          </View>
          {!!data.dueDate && (
            <View style={stdStyles.invoiceMeta}>
              <Text style={stdStyles.metaLabel}>DUE DATE:</Text>
              <View style={stdStyles.metaValueWrap}>
                <Text style={stdStyles.metaValue}>{data.dueDate}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* BILL TO */}
      <View style={stdStyles.billToSection} wrap={false}>
        <Text style={stdStyles.billToLabel}>Bill To:</Text>
        <Text style={stdStyles.clientName}>{data.clientName || 'Client Name'}</Text>
        {!!data.clientAddress && <Text style={stdStyles.clientDetails}>{data.clientAddress}</Text>}
        {!!data.clientEmail && <Text style={stdStyles.clientDetails}>{data.clientEmail}</Text>}
        {!!data.signOffText && (
          <View style={{ marginTop: 10 }}>
            <Text style={stdStyles.attnLabel}>Attn:</Text>
            <Text style={stdStyles.attnValue}>{data.signOffText}</Text>
          </View>
        )}
      </View>

      {/* ITEMS TABLE */}
      <View style={stdStyles.table}>
        {/* minPresenceAhead evita que el encabezado quede solo al final de una página */}
        <View style={stdStyles.tableHeader} minPresenceAhead={40}>
          <Text style={stdStyles.thDesc}>Description</Text>
          <Text style={stdStyles.thQty}>Qty.</Text>
          <Text style={stdStyles.thPrice}>Price</Text>
          <Text style={stdStyles.thTotal}>Total</Text>
        </View>
        {data.items.map((item, index) => {
          const desc = item.description || 'Item';
          // Filas cortas no se parten entre páginas; las muy largas sí pueden continuar.
          const keepTogether = desc.length < 700;
          return (
            <View key={index} style={stdStyles.tableRow} wrap={!keepTogether}>
              <Text style={stdStyles.tdDesc}>{desc}</Text>
              <View style={stdStyles.tdQtyWrap}>
                <Text style={stdStyles.tdQty}>{item.quantity}</Text>
                {!!item.unit && <Text style={stdStyles.tdUnit}>{item.unit}</Text>}
              </View>
              <Text style={stdStyles.tdPrice}>${formatCurrency(item.price)}</Text>
              <Text style={stdStyles.tdTotal}>${formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}</Text>
            </View>
          );
        })}
      </View>

      {/* TOTALS (siempre juntos, nunca partidos entre páginas) */}
      <View style={stdStyles.totalsSection} wrap={false}>
        <View style={stdStyles.totalsBlock}>
          <View style={stdStyles.totalRow}>
            <Text style={stdStyles.totalLabel}>Subtotal:</Text>
            <Text style={stdStyles.totalValue}>${formatCurrency(subtotal)}</Text>
          </View>
          {data.showTax && (
            <View style={stdStyles.totalRow}>
              <Text style={stdStyles.totalLabel}>Tax ({data.taxRate}%):</Text>
              <Text style={stdStyles.totalValue}>${formatCurrency(taxAmount)}</Text>
            </View>
          )}
          <View style={stdStyles.grandTotalRow}>
            <Text style={stdStyles.grandTotalLabel}>Total:</Text>
            <Text style={stdStyles.grandTotalValue}>${formatCurrency(total)}</Text>
          </View>
        </View>
      </View>

      {/* NOTES LARGAS */}
      {bodyNote && (
        <View style={stdStyles.notesSection}>
          <Text style={stdStyles.notesTitle} minPresenceAhead={30}>Notes</Text>
          <Text style={stdStyles.notesText}>{bodyNote}</Text>
        </View>
      )}

      {/* FOOTER FIJO EN CADA PÁGINA */}
      <View style={stdStyles.footer} fixed>
        <View style={stdStyles.footerSpacer} />
        <Text style={stdStyles.footerText}>{footerNote}</Text>
        <Text
          style={stdStyles.pageNumber}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : '')}
        />
      </View>
    </Page>
  );
};

// --- INFINIGUARD TEMPLATE COMPONENT ---
const InfiniguardTemplate = ({ data, subtotal, taxAmount, total }) => {
  return (
    <Page size="A4" style={infStyles.page}>
      <View style={infStyles.header}>
        <View style={infStyles.logoSection}>
          {data.logo && <PdfImage src={data.logo} style={infStyles.logo} />}
          {data.companyName && <Text style={infStyles.companyName}>{data.companyName}</Text>}
          {data.companyAddress && <Text style={infStyles.companyDetails}>{data.companyAddress}</Text>}
          {data.companyTaxId && <Text style={infStyles.companyDetails}>{data.companyTaxId}</Text>}
          {data.companyPhone && <Text style={infStyles.companyDetails}>{data.companyPhone}</Text>}
          {data.companyEmail && <Text style={infStyles.companyDetails}>{data.companyEmail}</Text>}

          {data.companyTagline && <Text style={infStyles.tagline}>{data.companyTagline}</Text>}
        </View>
        <View style={infStyles.invoiceTitleSection}>
          <Text style={infStyles.title}>Invoice</Text>
          <Text style={infStyles.invNumber}># {data.invoiceNumber || '---'}</Text>

          <Text style={infStyles.balanceLabelTitle}>Balance Due</Text>
          <Text style={infStyles.balanceAmountTitle}>${formatCurrency(total)}</Text>
        </View>
      </View>

      <View style={infStyles.infoRow} wrap={false}>
        <View style={infStyles.billToBlock}>
          <Text style={infStyles.billToLabel}>Bill To</Text>
          <Text style={infStyles.clientName}>{data.clientName || 'Client Name'}</Text>
          <Text style={infStyles.clientDetails}>{data.clientAddress}</Text>
          {data.signOffText && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 10, color: '#111', fontWeight: 'bold' }}>Attn:</Text>
              <Text style={{ fontSize: 9, color: '#333', marginTop: 2 }}>{data.signOffText}</Text>
            </View>
          )}
        </View>

        {data.shipToName && (
          <View style={infStyles.shipToBlock}>
            <Text style={infStyles.billToLabel}>Ship To</Text>
            <Text style={infStyles.clientDetails}>{data.shipToName}</Text>
            <Text style={infStyles.clientDetails}>{data.shipToAddress}</Text>
          </View>
        )}

        <View style={infStyles.metaBlock}>
          <View style={infStyles.metaRow}>
            <Text style={infStyles.metaLabel}>Invoice Date :</Text>
            <View style={{ flexDirection: 'column' }}>
              <Text style={infStyles.metaValue}>{data.date || '---'}</Text>
              {data.dateSubtext && <Text style={{ fontSize: 8, color: '#333', textAlign: 'right', marginTop: 2, width: 80 }}>{data.dateSubtext}</Text>}
            </View>
          </View>
          {data.terms && (
            <View style={infStyles.metaRow}>
              <Text style={infStyles.metaLabel}>Terms :</Text>
              <Text style={infStyles.metaValue}>{data.terms}</Text>
            </View>
          )}
          {data.dueDate ? (
            <View style={infStyles.metaRow}>
              <Text style={infStyles.metaLabel}>Due Date :</Text>
              <Text style={infStyles.metaValue}>{data.dueDate}</Text>
            </View>
          ) : null}
          {data.poNumber && (
            <View style={infStyles.metaRow}>
              <Text style={infStyles.metaLabel}>Reference P.O.# :</Text>
              <Text style={infStyles.metaValue}>{data.poNumber}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={infStyles.table}>
        <View style={infStyles.tableHeader} minPresenceAhead={40}>
          <Text style={infStyles.thHash}>#</Text>
          <Text style={infStyles.thDesc}>Item & Description</Text>
          <Text style={infStyles.thQty}>Qty</Text>
          <Text style={infStyles.thRate}>Rate</Text>
          <Text style={infStyles.thAmount}>Amount</Text>
        </View>
        {data.items.map((item, index) => {
          const desc = item.description || 'Item';
          const keepTogether = desc.length < 700;
          return (
            <View key={index} style={infStyles.tableRow} wrap={!keepTogether}>
              <Text style={infStyles.tdHash}>{index + 1}</Text>
              <Text style={infStyles.tdDesc}>{desc}</Text>
              <View style={infStyles.thQty}>
                <Text style={{ fontSize: 9, color: '#333', textAlign: 'right' }}>{Number(item.quantity).toFixed(2)}</Text>
                {item.unit && <Text style={{ fontSize: 8, color: '#666', marginTop: 2, textAlign: 'right' }}>{item.unit}</Text>}
              </View>
              <Text style={infStyles.tdRate}>{formatCurrency(item.price)}</Text>
              <Text style={infStyles.tdAmount}>{formatCurrency(item.quantity * item.price)}</Text>
            </View>
          );
        })}
      </View>

      <View style={infStyles.totalsSection} wrap={false}>
        <View style={infStyles.totalsBlock}>
          <View style={infStyles.totalRow}>
            <Text style={infStyles.totalLabel}>Sub Total</Text>
            <Text style={infStyles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {data.showTax && (
            <View style={infStyles.totalRow}>
              <Text style={infStyles.totalLabel}>Tax ({data.taxRate}%)</Text>
              <Text style={infStyles.totalValue}>{formatCurrency(taxAmount)}</Text>
            </View>
          )}
          <View style={infStyles.totalRowBold}>
            <Text style={infStyles.totalLabelBold}>Total</Text>
            <Text style={infStyles.totalValueBold}>${formatCurrency(total)}</Text>
          </View>
          <View style={infStyles.balanceRow}>
            <Text style={infStyles.totalLabelBold}>Balance Due</Text>
            <Text style={infStyles.totalValueBold}>${formatCurrency(total)}</Text>
          </View>
        </View>
      </View>

      <View style={infStyles.bottomSection}>
        {data.notes && (
          <View wrap={false}>
            <Text style={infStyles.notesTitle}>Notes</Text>
            <Text style={infStyles.notesText}>{data.notes}</Text>
          </View>
        )}

        {data.bankDetails && (
          <View style={{ marginTop: 10 }} wrap={false}>
            <Text style={infStyles.notesTitle}>Payment Options</Text>
            <Text style={infStyles.notesText}>{data.bankDetails}</Text>
          </View>
        )}
      </View>

      <View style={infStyles.termsSection} fixed>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={infStyles.termsTitle}>Terms & Conditions</Text>
            <Text style={infStyles.termsText}>Invoice currency is USD (United States dollars)</Text>
          </View>
          <Text
            style={{ fontSize: 8, color: '#6b7280' }}
            render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : '')}
          />
        </View>
      </View>
    </Page>
  );
};


// --- MAIN WRAPPER COMPONENT ---
const InvoiceDocument = ({ data }) => {
  const subtotal = data.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
  const taxAmount = data.showTax ? subtotal * ((Number(data.taxRate) || 0) / 100) : 0;
  const total = subtotal + taxAmount;

  return (
    <Document>
      {data.template === 'infiniguard' ? (
        <InfiniguardTemplate data={data} subtotal={subtotal} taxAmount={taxAmount} total={total} />
      ) : (
        <StandardTemplate data={data} subtotal={subtotal} taxAmount={taxAmount} total={total} />
      )}
    </Document>
  );
};

// --- MAIN UI COMPONENT ---
export function InvoiceSection({ title }) {
  const { clients, addDocument, updateDocument, addReceivable, editingInvoice, clearEditingInvoice } = useFinance();
  const { logActivity } = useActivity();
  const [activeTab, setActiveTab] = useState('editor'); // editor | preview
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [invoiceData, setInvoiceData] = useState({
    template: 'standard', // 'standard' | 'infiniguard'
    logo: null,
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    companyTaxId: '',
    companyTagline: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dateSubtext: '',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: '',
    poNumber: '',
    linkedClientId: null,
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    shipToName: '',
    shipToAddress: '',
    taxRate: 0,
    showTax: false,
    notes: '',
    signOffText: '',
    bankDetails: '',
    items: [
      { description: '', quantity: 1, price: 0, unit: '' },
    ]
  });

  // Si se seleccionó una factura para editar desde Vault, rellenar todos sus datos
  useEffect(() => {
    if (editingInvoice) {
      if (editingInvoice.data) {
        setInvoiceData(editingInvoice.data);
      } else {
        const matchNum = editingInvoice.name?.match(/Invoice_([^\.]+)\.pdf/i);
        if (matchNum) {
          setInvoiceData(prev => ({
            ...prev,
            invoiceNumber: matchNum[1]
          }));
        }
      }
      setActiveTab('editor');
    }
  }, [editingInvoice]);

  const handleCancelEdit = () => {
    clearEditingInvoice();
    loadStandardTemplate();
  };

  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange('logo', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0, unit: '' }]
    }));
  };

  const updateItem = (index, field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    }));
  };

  const removeItem = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData(prev => ({ ...prev, items: newItems }));
  };

  const loadStandardTemplate = () => {
    setInvoiceData({
      template: 'standard',
      logo: null,
      companyName: '',
      companyAddress: '',
      companyEmail: '',
      companyPhone: '',
      companyTaxId: '',
      companyTagline: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      dateSubtext: '',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms: '',
      poNumber: '',
      linkedClientId: null,
      clientName: '',
      clientAddress: '',
      clientEmail: '',
      shipToName: '',
      shipToAddress: '',
      taxRate: 0,
      showTax: false,
      notes: '',
      signOffText: '',
      bankDetails: '',
      items: [
        { description: '', quantity: 1, price: 0, unit: '' },
      ]
    });
  };

  const loadInfiniguard1 = () => {
    setInvoiceData(prev => ({
      ...prev,
      template: 'infiniguard',
      logo: LogoCarribean,
      companyName: 'Caribbean Energy Solutions',
      companyAddress: '1353 Ave. Luis Vigoreaux, PMB 167\nGuaynabo, PR 00966',
      companyEmail: '',
      companyPhone: 'Phone +1.858.414.1121 Fax +1.858.746.5190',
      companyTaxId: 'Tax ID : 66-0883673',
      companyTagline: 'INFINIGUARD - The Clear Choice for Anti-Corrosion',
      terms: 'Net 60 days',
      bankDetails: '',
      notes: '',
      signOffText: '',
      // Limpiar campos específicos de la factura para que la llenen desde cero
      invoiceNumber: '',
      poNumber: '',
      linkedClientId: null,
      clientName: '',
      clientAddress: '',
      clientEmail: '',
      shipToName: '',
      shipToAddress: '',
      taxRate: 0,
      showTax: false,
      items: [
        { description: '', quantity: 1, price: 0, unit: '' },
      ]
    }));
  };

  const loadInfiniguard2 = () => {
    setInvoiceData(prev => ({
      ...prev,
      template: 'infiniguard',
      logo: LogoInfiniguard,
      companyName: 'INFINIGUARD Global, Inc.',
      companyAddress: '2699 W 79th St\nUNIT 4\nHialeah, Florida 33016',
      companyEmail: 'https://www.infiniguard.com',
      companyPhone: '+1-858-414-1121',
      companyTaxId: 'EIN: 99-0472013',
      companyTagline: 'INFINIGUARD - The Clear Choice for Anti-Corrosion',
      terms: 'Net 60',
      bankDetails: 'Bank: JPMorgan Chase\nABA/Routing #: 322271627\nAccount #: 591798668',
      notes: 'Thanks for your business.',
      signOffText: '',
      // Clear invoice-specific fields so the user fills them from scratch
      invoiceNumber: '',
      poNumber: '',
      linkedClientId: null,
      clientName: '',
      clientAddress: '',
      clientEmail: '',
      shipToName: '',
      shipToAddress: '',
      taxRate: 0,
      showTax: false,
      items: [
        { description: '', quantity: 1, price: 0, unit: '' },
      ]
    }));
  };
  // Plantilla Protex: datos fijos de la empresa precargados, datos de la factura vacíos.
  const loadProtexTemplate = () => {
    setInvoiceData(prev => ({
      ...prev,
      template: 'standard',
      logo: LogoProtex,
      companyName: 'PROTEX INNOVATIONS',
      companyAddress: '28619 SONORAN FIELD CT\nFULSHEAR, TX 77441-1986',
      companyEmail: 'info_sales@protexinnovations.com',
      companyPhone: '',
      companyTaxId: '',
      companyTagline: '',
      terms: '',
      bankDetails: '',
      notes: 'Thank you for your business.',
      signOffText: '',
      // Campos específicos de la factura vacíos para llenarlos desde cero
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      dateSubtext: '',
      dueDate: '',
      poNumber: '',
      linkedClientId: null,
      clientName: '',
      clientAddress: '',
      clientEmail: '',
      shipToName: '',
      shipToAddress: '',
      taxRate: 0,
      showTax: false,
      items: [
        { description: '', quantity: 1, price: 0, unit: '' },
      ]
    }));
  };

  const subtotal = invoiceData.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
  const taxAmountUI = invoiceData.showTax ? subtotal * (invoiceData.taxRate / 100) : 0;
  const total = subtotal + taxAmountUI;

  const handleCreateInvoice = async () => {
    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const blob = await pdf(<InvoiceDocument data={invoiceData} />).toBlob();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const isEditing = !!editingInvoice;
        const documentName = `Invoice_${invoiceData.invoiceNumber || Date.now()}.pdf`;

        if (isEditing) {
          await updateDocument(editingInvoice.docId, {
            name: documentName,
            type: 'application/pdf',
            size: blob.size,
            category: 'Invoice',
            url: event.target.result,
            invoiceData: invoiceData
          });
          logActivity({
            type: ACTIVITY_TYPES.INVOICE_SAVED,
            title: 'Invoice updated',
            description: `Invoice #${invoiceData.invoiceNumber || '—'} for ${invoiceData.clientName || 'Client'}`
          });
          setSuccessModal({
            isOpen: true,
            message: 'La factura ha sido actualizada exitosamente en el Document Vault (manteniendo el mismo documento).'
          });
          clearEditingInvoice();
        } else {
          await addDocument({
            name: documentName,
            type: 'application/pdf',
            size: blob.size,
            category: 'Invoice',
            url: event.target.result,
            invoiceData: invoiceData
          });
          logActivity({
            type: ACTIVITY_TYPES.INVOICE_SAVED,
            title: 'Invoice generated and saved',
            description: `Invoice #${invoiceData.invoiceNumber || '—'} for ${invoiceData.clientName || 'Client'}`
          });

          let msg = 'The invoice was saved in the document vault.';
          if (invoiceData.linkedClientId) {
            addReceivable({
              clientName: invoiceData.clientName || 'Client',
              description: `Invoice Receivable ${invoiceData.invoiceNumber ? '#' + invoiceData.invoiceNumber : '—'} (${invoiceData.clientName})`,
              amount: total,
              expectedDate: invoiceData.dueDate,
            });
            msg += ' An accounts receivable entry has been created for this client.';
          }

          setSuccessModal({ isOpen: true, message: msg });
        }
        setIsCreating(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error creating/updating invoice", error);
      alert("Error generating the invoice.");
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">

      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
          Create professional invoices independently. Fill in the details, customize with your logo and download the PDF instantly.
        </p>

        <div className="flex items-center gap-3 relative">

          {/* TEMPLATES DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <LayoutTemplate size={16} /> Templates
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col p-1.5"
                >
                  <button onClick={() => { loadStandardTemplate(); setShowTemplates(false); }} className="text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Standard Template (Empty)</button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button onClick={() => { loadProtexTemplate(); setShowTemplates(false); }} className="text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium">Load Protex Template</button>
                  <button onClick={() => { loadInfiniguard1(); setShowTemplates(false); }} className="text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Load Caribbean Energy Template</button>
                  <button onClick={() => { loadInfiniguard2(); setShowTemplates(false); }} className="text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Load Infiniguard Template</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'editor' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings size={16} /> Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Eye size={16} /> PDF Preview
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'editor' ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6"
            >

              {editingInvoice && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Modo Edición</p>
                      <p className="text-sm font-semibold text-slate-800">
                        Editando la factura existente: <span className="text-indigo-600 font-bold">{editingInvoice.name}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Al guardar, se actualizará este mismo documento en el Vault sin crear un duplicado.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-200 transition-colors border border-amber-300 shrink-0"
                  >
                    Cancelar edición / Crear nueva
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* COMPANY INFO */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="text-indigo-600" />
                    <h3 className="text-slate-800 font-medium">Company Information</h3>
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-medium">Company Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {invoiceData.logo ? (
                          <img src={invoiceData.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="text-slate-300" size={24} />
                        )}
                      </div>
                      <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm cursor-pointer transition-colors border border-slate-200 shadow-sm">
                        <Upload size={16} />
                        Upload Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <button 
                        onClick={() => handleInputChange('logo', LogoProtex)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm cursor-pointer transition-colors border border-slate-200 shadow-sm"
                      >
                        <ImageIcon size={16} className="text-indigo-600" />
                        Usar Logo Protex
                      </button>
                      {invoiceData.logo && (
                        <button onClick={() => handleInputChange('logo', null)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <InputField label="Company Name" value={invoiceData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
                    <InputField label="Address" value={invoiceData.companyAddress} onChange={(e) => handleInputChange('companyAddress', e.target.value)} multiline rows={2} />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Email / Website" value={invoiceData.companyEmail} onChange={(e) => handleInputChange('companyEmail', e.target.value)} />
                      <InputField label="Phone" value={invoiceData.companyPhone} onChange={(e) => handleInputChange('companyPhone', e.target.value)} />
                    </div>
                    {invoiceData.template === 'infiniguard' && (
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Tax ID / EIN" value={invoiceData.companyTaxId} onChange={(e) => handleInputChange('companyTaxId', e.target.value)} />
                        <InputField label="Tagline" value={invoiceData.companyTagline} onChange={(e) => handleInputChange('companyTagline', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* INVOICE & CLIENT INFO */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <h3 className="text-slate-800 font-medium">Invoice Details</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <InputField label="Invoice #" value={invoiceData.invoiceNumber} onChange={(e) => handleInputChange('invoiceNumber', e.target.value)} />
                    <InputField label="Date" type="date" value={invoiceData.date} onChange={(e) => handleInputChange('date', e.target.value)} />
                    <InputField label="Date Subtext (Optional)" value={invoiceData.dateSubtext} onChange={(e) => handleInputChange('dateSubtext', e.target.value)} placeholder="e.g. valid for 30 days" />
                    <InputField label="Due Date (Optional)" type="date" value={invoiceData.dueDate} onChange={(e) => handleInputChange('dueDate', e.target.value)} />
                    {invoiceData.template === 'infiniguard' && (
                      <InputField label="Terms" value={invoiceData.terms} onChange={(e) => handleInputChange('terms', e.target.value)} placeholder="e.g. Net 60 days" />
                    )}
                    {invoiceData.template === 'infiniguard' && (
                      <InputField label="P.O. Number" value={invoiceData.poNumber} onChange={(e) => handleInputChange('poNumber', e.target.value)} placeholder="e.g. 229" />
                    )}
                  </div>

                  <hr className="border-slate-100 my-2" />

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Bill To (Client)</label>
                      <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                        value={invoiceData.linkedClientId || 'manual'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'manual') {
                            setInvoiceData(prev => ({ ...prev, linkedClientId: null, clientName: '', clientEmail: '', clientAddress: '' }));
                          } else {
                            const c = clients.find(cl => cl.id === val);
                            if (c) {
                              setInvoiceData(prev => ({ ...prev, linkedClientId: c.id, clientName: c.name, clientEmail: c.email || '', clientAddress: c.address || '' }));
                            }
                          }
                        }}
                      >
                        <option value="manual">-- Enter Manually --</option>
                        {clients?.filter(c => c.type === 'client').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {!invoiceData.linkedClientId && (
                      <InputField label="Client Name" value={invoiceData.clientName} onChange={(e) => handleInputChange('clientName', e.target.value)} placeholder="Client Name" />
                    )}
                    <InputField label="Billing Address" value={invoiceData.clientAddress} onChange={(e) => handleInputChange('clientAddress', e.target.value)} multiline rows={2} />

                    {invoiceData.template === 'infiniguard' && (
                      <>
                        <InputField label="Ship To (Optional)" value={invoiceData.shipToName} onChange={(e) => handleInputChange('shipToName', e.target.value)} placeholder="Ship To Name" />
                        <InputField label="Shipping Address" value={invoiceData.shipToAddress} onChange={(e) => handleInputChange('shipToAddress', e.target.value)} multiline rows={2} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ITEMS LIST */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-800 font-medium">Line Items / Services</h3>
                </div>

                <div className="hidden sm:grid grid-cols-[1fr_80px_100px_120px_120px_40px] gap-4 px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div>Description</div>
                  <div className="text-center">Unit</div>
                  <div className="text-center">Qty.</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Total</div>
                  <div></div>
                </div>

                <div className="flex flex-col gap-3">
                  {invoiceData.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_100px_120px_120px_40px] gap-3 sm:gap-4 items-end sm:items-center bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-transparent">
                      <div className="w-full">
                        <span className="sm:hidden text-xs text-slate-500 font-medium mb-1 block">Description</span>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="Item description..."
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <span className="sm:hidden text-xs text-slate-500 font-medium mb-1 block">Unit</span>
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          placeholder="Ej. qt."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <span className="sm:hidden text-xs text-slate-500 font-medium mb-1 block">Qty.</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <span className="sm:hidden text-xs text-slate-500 font-medium mb-1 block">Price</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-800 text-right focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-auto text-right">
                        <span className="sm:hidden text-xs text-slate-500 font-medium mb-1 block">Total</span>
                        <span className="text-slate-800 font-medium">${formatCurrency(item.quantity * item.price)}</span>
                      </div>
                      <div className="w-full sm:w-auto flex justify-end">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={invoiceData.items.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addItem}
                  className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all text-sm font-medium"
                >
                  <Plus size={16} /> Add Line Item
                </button>
              </div>

              {/* FOOTER & TOTALS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <InputField label="Tax (%)" type="number" value={invoiceData.taxRate} onChange={(e) => handleInputChange('taxRate', Number(e.target.value))} />
                    </div>
                    <div className="flex-1 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={invoiceData.showTax} 
                          onChange={(e) => handleInputChange('showTax', e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700 font-medium">Include Tax</span>
                      </label>
                    </div>
                  </div>
                  <InputField label="Attn (Optional)" value={invoiceData.signOffText} onChange={(e) => handleInputChange('signOffText', e.target.value)} placeholder="Attention to..." />
                  
                  <InputField label="Additional Notes" value={invoiceData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} multiline rows={3} placeholder="Payment instructions..." />

                  {invoiceData.template === 'infiniguard' && (
                    <InputField label="Payment Options / Bank Details" value={invoiceData.bankDetails} onChange={(e) => handleInputChange('bankDetails', e.target.value)} multiline rows={3} placeholder="Bank account details..." />
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col justify-center">
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-600 text-sm font-medium">
                      <span>Subtotal</span>
                      <span>${formatCurrency(subtotal)}</span>
                    </div>
                    {invoiceData.showTax && (
                      <div className="flex justify-between text-slate-600 text-sm font-medium">
                        <span>Tax ({invoiceData.taxRate}%)</span>
                        <span>${formatCurrency(taxAmountUI)}</span>
                      </div>
                    )}
                    <div className="h-px w-full bg-indigo-200 my-2" />
                    <div className="flex justify-between text-slate-900 text-xl font-bold">
                      <span>Total</span>
                      <span className="text-indigo-600">${formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="w-full h-full min-h-[calc(100vh-250px)] flex flex-col gap-4"
            >

              <div className="flex-1 w-full bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden min-h-[600px] shadow-sm relative group">
                <PDFViewer width="100%" height="100%" className="border-none" showToolbar={true}>
                  <InvoiceDocument data={invoiceData} />
                </PDFViewer>
                
                <div className="absolute bottom-6 right-6">
                  <button
                    onClick={handleCreateInvoice}
                    disabled={isCreating}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={24} />
                        {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {successModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSuccessModal({ isOpen: false, message: '' })} />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {editingInvoice ? 'Invoice Updated!' : 'Invoice Created!'}
                </h3>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  {successModal.message}
                </p>
                <button onClick={() => setSuccessModal({ isOpen: false, message: '' })} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md hover:shadow-lg">
                  Got it
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Subcomponente reutilizable para inputs
function InputField({ label, type = "text", value, onChange, placeholder, multiline = false, rows = 1 }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
        />
      )}
    </div>
  );
}

function ArrowRightIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  )
}
