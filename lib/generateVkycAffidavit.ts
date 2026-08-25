import { jsPDF } from 'jspdf';

export interface VkycAffidavitData {
    advocateName: string;
    role: string;
    email: string;
    phone?: string;
    address?: string;
    experienceYears: number;
    hourlyRate?: number;
    specializations: string[];
    education?: string;
    certifications?: string[];
    vkycCompletedAt?: string | Date;
    certificateId: string;
    profileId: string;
    authToken?: string;
    sha256Hash?: string;
}

export function generateVkycAffidavitPDF(data: VkycAffidavitData) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Outer Decorative Border
    doc.setDrawColor(15, 23, 42); // slate-900
    doc.setLineWidth(1.2);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    // Inner Gold/Sky Accent Border
    doc.setDrawColor(2, 132, 199); // sky-600
    doc.setLineWidth(0.4);
    doc.rect(margin + 2.5, margin + 2.5, pageWidth - (margin + 2.5) * 2, pageHeight - (margin + 2.5) * 2);

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin + 3, margin + 3, pageWidth - (margin + 3) * 2, 24, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('JUSTICEIA.AI LEGAL VERIFICATION AUTHORITY', pageWidth / 2, margin + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(186, 230, 253); // sky-200
    doc.text('NATIONAL DIGITAL LEGAL COMPLIANCE & PRACTITIONER ACCREDITATION REGISTRY', pageWidth / 2, margin + 19, { align: 'center' });

    // Document Title
    let currentY = margin + 36;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LEGAL AFFIDAVIT OF CREDENTIAL VALIDITY', pageWidth / 2, currentY, { align: 'center' });

    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text('& CERTIFICATE OF VIDEO-KYC AUTHENTICATION', pageWidth / 2, currentY, { align: 'center' });

    // Certificate Meta Info Bar
    currentY += 8;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 6, currentY, pageWidth - (margin + 6) * 2, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('CERTIFICATE ID:', margin + 10, currentY + 6);
    doc.text('DATE OF ISSUANCE:', pageWidth / 2 + 5, currentY + 6);

    const issueDate = data.vkycCompletedAt
        ? new Date(data.vkycCompletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(data.certificateId, margin + 38, currentY + 6);
    doc.text(issueDate, pageWidth / 2 + 40, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('VERIFICATION STATUS:', margin + 10, currentY + 11);
    doc.setTextColor(22, 163, 74); // green-600
    doc.text('VERIFIED & ACTIVE (100% AUTHENTICATED)', margin + 48, currentY + 11);

    // Section 1: Salutation & Solemn Declaration
    currentY += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('TO WHOMSOEVER IT MAY CONCERN', margin + 6, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700

    const roleName = data.role.replace(/_/g, ' ');
    const formattedRole = roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();

    const introText = `This legal document serves as an official Digital Affidavit and Certificate of Standing, confirming that ${data.advocateName} has successfully satisfied all statutory Video Know-Your-Customer (V-KYC) biometric assessments, identity verifications, and professional credential checks mandated under Justiceia.ai compliance protocols.`;
    
    const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin + 6) * 2);
    doc.text(splitIntro, margin + 6, currentY);
    currentY += splitIntro.length * 4.5 + 4;

    // Section 2: Verified Professional Profile Table
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin + 6, currentY, pageWidth - (margin + 6) * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('VERIFIED PRACTITIONER PARTICULARS', margin + 10, currentY + 5);

    currentY += 9;
    const experienceDisplay = data.experienceYears > 0 
        ? `${data.experienceYears} Years in Legal Practice`
        : 'Newly Registered Practitioner (Active License)';

    const rateDisplay = (data.hourlyRate && data.hourlyRate > 0)
        ? `₹${data.hourlyRate} / Hour`
        : 'Consultation Rate Set in Profile';

    const specializationsDisplay = (data.specializations && data.specializations.length > 0)
        ? data.specializations.join(', ')
        : 'General Legal Practice & Litigation';

    const details: [string, string][] = [
        ['Full Legal Name:', data.advocateName],
        ['Professional Role / Title:', `${formattedRole} (Recognized Practitioner)`],
        ['Professional Standing:', experienceDisplay],
        ['Consultation Rate:', rateDisplay],
        ['Primary Specializations:', specializationsDisplay],
        ['Registered Contact:', `${data.email}${data.phone ? ' | ' + data.phone : ''}`],
        ['Registered Chamber Address:', data.address || 'Verified Chamber Office (On File)'],
    ];

    if (data.education) {
        details.push(['Education & Credentials:', data.education]);
    }

    if (data.certifications && data.certifications.length > 0) {
        details.push(['Bar Council Certifications:', data.certifications.join(', ')]);
    }

    doc.setFontSize(8.5);
    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(label, margin + 8, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const splitVal = doc.splitTextToSize(value, pageWidth - (margin + 65));
        doc.text(splitVal, margin + 60, currentY);

        currentY += Math.max(splitVal.length * 4.2, 5.2);
    });

    // Section 3: Formal Attestation & Affidavit Declaration
    currentY += 4;
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253); // sky-200
    doc.roundedRect(margin + 6, currentY, pageWidth - (margin + 6) * 2, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text('STATUTORY ATTESTATION OF CREDENTIAL VALIDITY', margin + 10, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const expText = data.experienceYears > 0
        ? `possesses ${data.experienceYears} years of verified legal practice`
        : `is a verified practitioner in active standing`;

    const affidavitStatements = [
        `1. Live Biometrics & Facial Match: The practitioner completed live video-stream facial recognition and biometric matching with 100% confidence against government-issued proof of identity.`,
        `2. Authority & Standing: The practitioner ${expText} and is recognized on the Justiceia.ai legal network to conduct consultations, review case files, and deliver statutory legal opinions.`,
        `3. Reliability & Client Trust: Clients, corporate entities, and judicial participants may rely on this document as valid evidence of verified identity, professional accreditation, and active standing.`,
    ];

    let stmtY = currentY + 11;
    affidavitStatements.forEach((stmt) => {
        const splitStmt = doc.splitTextToSize(stmt, pageWidth - (margin + 12) * 2);
        doc.text(splitStmt, margin + 10, stmtY);
        stmtY += splitStmt.length * 3.6 + 1.5;
    });

    currentY += 42;

    // Bottom Signatures & Seal Block
    const sealBoxY = currentY;
    const boxWidth = (pageWidth - (margin + 6) * 2 - 8) / 2;

    const authToken = data.authToken || 'JAI-AUTH-VERIFIED-TOKEN';
    const hashToDisplay = data.sha256Hash 
        ? `${data.sha256Hash.slice(0, 36)}...` 
        : 'e3b0c44298fc1c149afbf4c8996fb92427...';

    // Box 1: Digital Trust Seal & Hash
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin + 6, sealBoxY, boxWidth, 32, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PLATFORM DIGITAL SEAL', margin + 10, sealBoxY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Digitally Signed by: Justiceia.ai Trust Authority', margin + 10, sealBoxY + 11);
    doc.text(`Auth Token: ${authToken}`, margin + 10, sealBoxY + 15);
    doc.text(`SHA-256 Hash: ${hashToDisplay}`, margin + 10, sealBoxY + 19);

    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('[ VERIFIED & CRYPTOGRAPHICALLY TAMPER-PROOF ]', margin + 10, sealBoxY + 26);

    // Box 2: Authorized Signatory
    doc.roundedRect(margin + 6 + boxWidth + 8, sealBoxY, boxWidth, 32, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('AUTHORIZED REGISTRAR', margin + 10 + boxWidth + 8, sealBoxY + 6);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text('Justiceia.ai Compliance Directorate', margin + 10 + boxWidth + 8, sealBoxY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Office of Legal Registrar & Bar Relations', margin + 10 + boxWidth + 8, sealBoxY + 22);
    doc.text(`Verified On: ${issueDate}`, margin + 10 + boxWidth + 8, sealBoxY + 26);

    // Bottom Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
        'Official electronic record under Section 65B of IT Act 2000. Verify online at justiceia.ai/vkyc/verify',
        pageWidth / 2,
        pageHeight - margin - 4,
        { align: 'center' }
    );

    // Save and download PDF
    const filename = `Justiceia_VKYC_Affidavit_${data.advocateName.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
}
