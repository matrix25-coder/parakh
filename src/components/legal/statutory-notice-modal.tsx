'use client';

import React, { useState } from 'react';
import type { ComplianceReport } from '@/lib/types';
import { compileFormVNotice, type FormVNoticeData } from '@/lib/legal/notice-generator';
import jsPDF from 'jspdf';

export interface StatutoryNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ComplianceReport;
  establishmentName?: string;
  establishmentAddress?: string;
  inspectorName?: string;
  manifest?: any;
  initialCompoundingFine?: number;
  initialOffenceType?: string;
}

export function StatutoryNoticeModal({
  isOpen,
  onClose,
  report,
  establishmentName = 'Commercial Retail Establishment',
  establishmentAddress = 'Retail Premise under Inspection',
  inspectorName = 'Field Inspection Officer',
  manifest,
  initialCompoundingFine,
  initialOffenceType,
}: StatutoryNoticeModalProps) {
  const [estName, setEstName] = useState(establishmentName);
  const [estAddress, setEstAddress] = useState(establishmentAddress);
  const [proprietor, setProprietor] = useState('Store Manager / Proprietor');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isDefaultRepeat = report?.violations ? report.violations.length >= 3 : false;
  const defaultFee = initialCompoundingFine ?? (isDefaultRepeat ? 50000 : 25000);
  const defaultType = initialOffenceType ?? (isDefaultRepeat ? 'REPEAT_OFFENCE' : 'FIRST_OFFENCE');
  const defaultProvision = isDefaultRepeat
    ? 'Section 36(2) Enhanced Compounding, Legal Metrology Act, 2009'
    : 'Section 36(1) r/w Section 48 (Compounding of Offenses), Legal Metrology Act, 2009';

  const [fineAmount, setFineAmount] = useState<number | string>(defaultFee);
  const [offenceType, setOffenceType] = useState<string>(defaultType);
  const [legalProvision, setLegalProvision] = useState<string>(defaultProvision);
  const [isEditingFine, setIsEditingFine] = useState(false);

  if (!isOpen) return null;

  const noticeData: FormVNoticeData = compileFormVNotice(
    report,
    {
      name: estName,
      address: estAddress,
      proprietorName: proprietor,
    },
    manifest,
    inspectorName,
    report.violations?.length ? report.violations.length >= 3 : false
  );

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colors & Styling
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('GOVERNMENT OF INDIA', 105, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.text('DEPARTMENT OF CONSUMER AFFAIRS', 105, 26, { align: 'center' });
      doc.text('LEGAL METROLOGY ENFORCEMENT DIVISION', 105, 31, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(20, 34, 190, 34);

      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('FORM V: STATUTORY SHOW-CAUSE NOTICE', 105, 42, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('times', 'italic');
      doc.text('[Under Section 36 of the Legal Metrology Act, 2009 & Rule 32 of PC Rules, 2011]', 105, 47, { align: 'center' });

      // Notice Ref & Date
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`Notice Reference: ${noticeData.noticeNumber}`, 20, 56);
      doc.text(`Date of Issue: ${noticeData.issueDateIst}`, 130, 56);

      // Addressee
      doc.setFont('times', 'bold');
      doc.text('To,', 20, 64);
      doc.setFont('times', 'normal');
      doc.text(`The Proprietor / Director / Authorized Signatory,`, 20, 69);
      doc.setFont('times', 'bold');
      doc.text(`${noticeData.establishment.name}`, 20, 74);
      doc.setFont('times', 'normal');
      doc.text(`${noticeData.establishment.address}`, 20, 79);

      // Body Paragraph
      doc.setFont('times', 'normal');
      const introText = `WHEREAS, on ${noticeData.issueDateIst}, an official statutory inspection under the provisions of the Legal Metrology Act, 2009 was conducted by the undersigned enforcement officer at your premises. During the survey, the following pre-packaged commodity was inspected and found to be in prima facie contravention of mandatory statutory declarations:`;
      const splitIntro = doc.splitTextToSize(introText, 170);
      doc.text(splitIntro, 20, 88);

      // Commodity Box
      let y = 104;
      doc.setFillColor(245, 247, 250);
      doc.rect(20, y, 170, 16, 'F');
      doc.setFont('times', 'bold');
      doc.text(`Commodity: ${noticeData.commodityDetails.productName} (${noticeData.commodityDetails.category})`, 24, y + 6);
      doc.setFont('times', 'normal');
      doc.text(`Forensic Evidence Code: ${noticeData.evidenceCertification.verificationCode}`, 24, y + 11);

      // Violations List
      y = 126;
      doc.setFont('times', 'bold');
      doc.text('STATEMENT OF CONTRAVENTIONS & STATUTORY INFRINGEMENTS:', 20, y);
      y += 6;

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      noticeData.violations.forEach((v, index) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('times', 'bold');
        doc.text(`${index + 1}. [${v.ruleCode}] ${v.ruleNumber} - ${v.statutoryProvision}`, 22, y);
        y += 4.5;
        doc.setFont('times', 'normal');
        const desc = doc.splitTextToSize(`Infringement: ${v.infringementDescription}`, 165);
        doc.text(desc, 26, y);
        y += desc.length * 4.5 + 2;
      });

      // Compounding Penalty Calculation
      y += 4;
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(255, 245, 235);
      doc.rect(20, y, 170, 18, 'F');
      doc.setFont('times', 'bold');
      doc.setTextColor(190, 60, 20);
      const displayFine = typeof fineAmount === 'number' ? fineAmount : Number(fineAmount) || 0;
      doc.text(`STATUTORY COMPOUNDING FINE TIER (${offenceType}): ₹ ${displayFine.toLocaleString('en-IN')}`, 24, y + 7);
      doc.setFont('times', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Legal Provision: ${legalProvision}`, 24, y + 13);

      // Electronic Evidence Seal
      y += 24;
      doc.setFontSize(8);
      doc.setFont('times', 'italic');
      doc.text(`Electronic Evidence Certification: Section 63, Bharatiya Sakshya Adhiniyam, 2023`, 20, y);
      doc.text(`Raw Image SHA-256 Digest: ${noticeData.evidenceCertification.sha256Hash}`, 20, y + 4);
      doc.text(`GPS Coordinates: ${noticeData.evidenceCertification.gpsCoordinates}`, 20, y + 8);

      // Signature Block
      y += 20;
      doc.setFont('times', 'bold');
      doc.text(`(${noticeData.issuingAuthority.officerName})`, 130, y);
      doc.text(`Authorized Legal Metrology Inspector`, 130, y + 5);
      doc.setFont('times', 'normal');
      doc.text(`Enforcement Circle, Legal Metrology`, 130, y + 10);

      doc.save(`Form_V_Notice_${noticeData.noticeNumber.replace(/\//g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
      <div className="bg-[#0A2540] border-2 border-blue-500 text-white max-w-3xl w-full p-6 shadow-2xl space-y-4 my-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚖️</span>
              <h3 className="font-mono font-bold text-base text-white">
                Statutory Show-Cause Notice (Form V Generator)
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Courtroom-admissible notice under Section 36 of the Legal Metrology Act, 2009 & Rule 32 of PC Rules.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-mono font-bold text-lg">✕</button>
        </div>

        {/* Establishment Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-3.5 border border-slate-700 font-mono text-xs">
          <div>
            <label className="text-slate-400 text-[10px] uppercase">Establishment / Store Name:</label>
            <input
              type="text"
              value={estName}
              onChange={(e) => setEstName(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-600 text-white rounded-xs"
            />
          </div>
          <div>
            <label className="text-slate-400 text-[10px] uppercase">Proprietor / Representative:</label>
            <input
              type="text"
              value={proprietor}
              onChange={(e) => setProprietor(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-600 text-white rounded-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-slate-400 text-[10px] uppercase">Physical Premise Address:</label>
            <input
              type="text"
              value={estAddress}
              onChange={(e) => setEstAddress(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-600 text-white rounded-xs"
            />
          </div>
          <div>
            <label className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
              <span>Compounding Fine Amount (₹):</span>
              <span className="text-amber-400 font-bold">Rule 32</span>
            </label>
            <div className="flex items-center gap-1 mt-1 bg-slate-800 border border-amber-600/60 px-2 py-0.5 rounded-xs">
              <span className="text-amber-400 font-bold font-mono">₹</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full py-1 bg-transparent border-0 text-amber-200 font-bold font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-[10px] uppercase">Offence Classification Tier:</label>
            <select
              value={offenceType}
              onChange={(e) => {
                const val = e.target.value;
                setOffenceType(val);
                if (val === 'FIRST_OFFENCE') {
                  setFineAmount(25000);
                  setLegalProvision('Section 36(1) r/w Section 48 (Compounding of Offenses), Legal Metrology Act, 2009');
                } else if (val === 'SUBSEQUENT_OFFENCE' || val === 'REPEAT_OFFENCE') {
                  setFineAmount(50000);
                  setLegalProvision('Section 36(2) Enhanced Compounding, Legal Metrology Act, 2009');
                }
              }}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-amber-600/60 text-amber-200 font-mono text-xs rounded-xs focus:outline-none"
            >
              <option value="FIRST_OFFENCE">FIRST_OFFENCE (Standard: ₹25,000)</option>
              <option value="SUBSEQUENT_OFFENCE">SUBSEQUENT_OFFENCE (Enhanced: ₹50,000)</option>
              <option value="REPEAT_OFFENCE">REPEAT_OFFENCE (Prosecution Referral)</option>
              <option value="CUSTOM_OFFENCE">CUSTOM_OFFENCE (Officer Discretion)</option>
            </select>
          </div>
        </div>

        {/* Notice Preview Card */}
        <div className="bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-3 max-h-[40vh] overflow-y-auto">
          <div className="text-center space-y-0.5 border-b border-slate-800 pb-2">
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Office of the Controller of Legal Metrology</div>
            <div className="text-emerald-400 font-bold text-sm">FORM V: STATUTORY SHOW-CAUSE NOTICE</div>
            <div className="text-slate-500 text-[10px]">Ref: {noticeData.noticeNumber} | Issued: {noticeData.issueDateIst}</div>
          </div>

          <div>
            <span className="text-slate-400">Notice Addressee:</span>{' '}
            <strong className="text-white">{noticeData.establishment.name}</strong>, {noticeData.establishment.address}
          </div>

          <div className="bg-slate-900 p-2.5 border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Itemized Infringement Counts ({noticeData.violations.length})</div>
            {noticeData.violations.map((v, i) => (
              <div key={i} className="text-[11px] text-rose-300">
                • <strong>{v.ruleCode}</strong> [{v.ruleNumber}]: {v.infringementDescription}
              </div>
            ))}
          </div>

          {/* Compounding Fine Tier (Rule 32) — Directly Interactive & Editable */}
          <div className="p-3 bg-amber-950/40 border border-amber-700/80 space-y-2 rounded-xs transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-800/60 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <span>⚖️</span> Prescribed Compounding Fine Tier (Rule 32)
                </span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-600/50 px-1.5 py-0.2 rounded-xs font-sans">
                  Editable
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Quick Presets */}
                <button
                  type="button"
                  onClick={() => {
                    setFineAmount(25000);
                    setOffenceType('FIRST_OFFENCE');
                    setLegalProvision('Section 36(1) r/w Section 48 (Compounding of Offenses), Legal Metrology Act, 2009');
                  }}
                  className={`px-2 py-0.5 border cursor-pointer transition-colors text-[10px] ${
                    Number(fineAmount) === 25000 && offenceType === 'FIRST_OFFENCE'
                      ? 'bg-amber-600 text-white border-amber-400 font-bold'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
                  }`}
                >
                  ₹25k (1st)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFineAmount(50000);
                    setOffenceType('SUBSEQUENT_OFFENCE');
                    setLegalProvision('Section 36(2) Enhanced Compounding, Legal Metrology Act, 2009');
                  }}
                  className={`px-2 py-0.5 border cursor-pointer transition-colors text-[10px] ${
                    Number(fineAmount) === 50000
                      ? 'bg-amber-600 text-white border-amber-400 font-bold'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
                  }`}
                >
                  ₹50k (Repeat)
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingFine((prev) => !prev)}
                  className="px-2.5 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/60 text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ml-1"
                >
                  <span>{isEditingFine ? '✓ Done' : '✏️ Edit'}</span>
                </button>
              </div>
            </div>

            {isEditingFine ? (
              /* Expanded Edit Fields */
              <div className="space-y-2 pt-1 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <label className="text-[10px] text-amber-300 block uppercase font-bold mb-1">
                      Compounding Fine Amount (INR):
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/80 px-2.5 py-1.5">
                      <span className="text-amber-400 font-bold text-base">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={fineAmount}
                        onChange={(e) => setFineAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="25000"
                        className="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="text-[10px] text-amber-300 block uppercase font-bold mb-1">
                      Offence Tier:
                    </label>
                    <select
                      value={offenceType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOffenceType(val);
                        if (val === 'FIRST_OFFENCE') {
                          setFineAmount(25000);
                          setLegalProvision('Section 36(1) r/w Section 48 (Compounding of Offenses), Legal Metrology Act, 2009');
                        } else if (val === 'SUBSEQUENT_OFFENCE' || val === 'REPEAT_OFFENCE') {
                          setFineAmount(50000);
                          setLegalProvision('Section 36(2) Enhanced Compounding, Legal Metrology Act, 2009');
                        }
                      }}
                      className="w-full bg-slate-900 border border-amber-500/80 text-amber-200 px-2.5 py-2 font-mono text-xs focus:outline-none"
                    >
                      <option value="FIRST_OFFENCE">FIRST_OFFENCE (Rule 32)</option>
                      <option value="SUBSEQUENT_OFFENCE">SUBSEQUENT_OFFENCE (Sec 36(2))</option>
                      <option value="REPEAT_OFFENCE">REPEAT_OFFENCE (Prosecution)</option>
                      <option value="CUSTOM_OFFENCE">CUSTOM_OFFENCE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-amber-300 block uppercase font-bold mb-1">
                    Statutory Legal Provision:
                  </label>
                  <input
                    type="text"
                    value={legalProvision}
                    onChange={(e) => setLegalProvision(e.target.value)}
                    placeholder="Section 36(1) r/w Section 48, Legal Metrology Act, 2009"
                    className="w-full bg-slate-900 border border-amber-500/80 text-slate-200 px-2.5 py-1.5 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Display mode matching the screenshot, with interactive click-to-edit */
              <div
                onClick={() => setIsEditingFine(true)}
                className="flex items-center justify-between cursor-pointer group hover:bg-amber-900/30 p-1.5 rounded-xs transition-colors"
                title="Click to edit compounding fine amount or tier"
              >
                <div>
                  <div className="text-white font-bold text-base font-mono flex items-center gap-1.5">
                    <span>₹</span>
                    <span>
                      {typeof fineAmount === 'number'
                        ? fineAmount.toLocaleString('en-IN')
                        : Number(fineAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-amber-400 font-sans font-normal opacity-70 group-hover:opacity-100 transition-opacity">
                      (Click to edit)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {legalProvision}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-amber-900 text-amber-200 px-2.5 py-1 border border-amber-600 rounded-xs font-mono font-bold tracking-wider">
                    {offenceType}
                  </span>
                  <span className="text-amber-400 text-xs opacity-70 group-hover:opacity-100">✏️</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
            <div>Cryptographic Chain of Custody: {noticeData.evidenceCertification.legalCertificationSection}</div>
            <div>SHA-256 Digest: {noticeData.evidenceCertification.sha256Hash}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700">
          <div className="text-slate-400 font-mono text-xs">
            Notice Reply Period: <span className="text-white font-bold">7 Statutory Days</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>{isGeneratingPdf ? 'Compiling PDF...' : '📄 Download Courtroom PDF (Form V)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
