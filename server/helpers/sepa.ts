// MsgID <-- muss eindeutig sein
import SEPA from "sepa";
import { Invoice } from "@/admin/components/Invoices";
import { config } from "./config";
import { Payment } from "@/admin/components/Contacts";

export const generateMessageId = (bic = "") => {
  const now = new Date();

  // Format date as YYMMDD
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");

  // Format time as HHMMSS0
  const timePart =
    now
      .toTimeString()
      .slice(0, 8) // "HH:MM:SS"
      .replace(/:/g, "") + "0";

  // Combine all parts
  return `${bic}${datePart}${timePart}`;
};

const generateEnd2EndId = (payment: Payment) => {
  return `${payment.contact.mandateId}-${payment.invoice.voucherNumber}`;
};

const convertGermanDate = (date: string) => {
  const [day, month, year] = date.split(".");
  const fixedDate = new Date(`${year}-${month}-${day}`);
  return fixedDate;
};

export const createSepaXMLDocument = (id: string, payments: Payment[]) => {
  const doc = new SEPA.Document("pain.008.001.08");
  doc.grpHdr.id = id;
  doc.grpHdr.created = new Date();
  doc.grpHdr.initiatorName = config.get("creditor.name", "").slice(0, 70);

  const info = doc.createPaymentInfo();
  info.collectionDate = convertGermanDate(
    config.get("creditor.reqdColltnDate")
  );
  info.creditorIBAN = config.get("creditor.iban");
  info.creditorBIC = config.get("creditor.bic");
  info.creditorName = config.get("creditor.name", "").slice(0, 70);
  info.creditorId = config.get("creditor.identification");
  info.batchBooking = true;
  doc.addPaymentInfo(info);

  for (let payment of payments) {
    const tx = info.createTransaction();
    tx.debtorName = payment.contact.name;
    tx.debtorIBAN = payment.contact.bankAccount.iban;
    tx.debtorBIC = payment.contact.bankAccount.bic;
    tx.mandateId = payment.contact.mandateId;
    tx.mandateSignatureDate = convertGermanDate(
      payment.contact.bankAccount.dtOfSgntr
    );
    tx.amount = payment.invoice.totalAmount;
    tx.currency = "EUR";
    tx.remittanceInfo = payment.invoice.voucherNumber;
    tx.end2endId = generateEnd2EndId(payment);
    info.addTransaction(tx);
  }

  return doc.toString();
};
