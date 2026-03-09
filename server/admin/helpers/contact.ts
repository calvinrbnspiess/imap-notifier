import { Contact, ContactWithBankAccount } from "../components/Contacts";

export const hasValidBankDetails = (contact: ContactWithBankAccount) =>
  contact &&
  contact.bankAccount?.bic.trim() !== "" &&
  contact.bankAccount?.iban.trim() !== "" &&
  contact.bankAccount?.dtOfSgntr.trim() !== "";
