import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { Spinner } from "./components/Spinner";
import { filterEmptyKeys } from "./helpers/object";
import { toast } from "sonner";
import { Config } from "@/helpers/config";
import { PlayIcon, DownloadIcon } from "./components/Icons";
import { Card } from "./components/Card";
import { InputField } from "./components/InputField";
import { Button, MiniButton } from "./components/Button";
import { Contact, Contacts, Payment } from "./components/Contacts";
import { Invoice, Invoices, statusOptions } from "./components/Invoices";
import { SelectField } from "./components/SelectField";
import { CodeBlock } from "react-code-blocks";
import { downloadFile } from "./helpers/file";
import { Datepicker } from "./components/DatePicker";
import { hasValidBankDetails } from "./helpers/contact";
import { AlertCircle } from "lucide-react";

const FormError = ({ children }: PropsWithChildren) => (
  <div className="my-1 mb-2 flex items-center space-x-2 text-red-600">
    <AlertCircle size={20} />
    <p className="text-sm">{children}</p>
  </div>
);

export const IBAN_PATTERN =
  /^([A-Z]{2}[ \-]?[0-9]{2})(?=(?:[ \-]?[A-Z0-9]){9,30}$)((?:[ \-]?[A-Z0-9]{3,5}){2,7})([ \-]?[A-Z0-9]{1,3})?$/;

export const BIC_PATTERN = /^[a-z]{6}[2-9a-z][0-9a-np-z]([a-z0-9]{3}|x{3})?$/i;

export const DATE_PATTERN =
  /\b(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})\b/;

export const App = () => {
  const [isSaving, setSaving] = useState(false);
  const [isRunning, setRunning] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    trigger,
    control,
    formState: { isLoading, isDirty, isValid, errors },
  } = useForm<Config>({
    defaultValues: async () =>
      await fetch("/api/config").then((res) => {
        // setTimeout(() => {
        // trigger();
        // }, 500);
        return res.json();
      }),
    mode: "onChange",
  });

  useEffect(() => {
    trigger();
  }, [isLoading]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [sepaFile, setSepaFile] = useState({
    id: null,
    xml: null,
  });

  const accounts = useWatch({
    control,
    name: "accounts",
  });

  const contactsWithBankAccounts = useMemo(() => {
    return contacts.map((contact) => {
      return {
        ...contact,
        bankAccount: Object.assign(
          { id: contact.id, iban: "", bic: "", dtOfSgntr: "" },
          (accounts || []).find((account) => account.id === contact.id)
        ),
      };
    });
  }, [accounts, contacts]);

  const saveSettings = handleSubmit((data) => {
    setSaving(true);
    fetch("/api/config", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(filterEmptyKeys(data)),
    })
      .then((res) => res.json())
      .then((json) => {
        setTimeout(() => {
          setSaving(false);
          fetchContacts();
          fetchInvoices();

          if (!json.success || !json.configuration) {
            return;
          }

          reset(json.configuration);
        }, 500);
        console.log(json);
      });
  });

  const fetchContacts = useCallback(() => {
    fetch("/api/lexoffice/contacts", {
      method: "GET",
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          return;
        }

        setContacts(json.contacts || []);
      });
  }, []);

  const fetchInvoices = useCallback(() => {
    fetch("/api/lexoffice/invoices", {
      method: "GET",
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          return;
        }

        setInvoices(json.invoices || []);
      });
  }, []);

  const [unusedInvoices, setUnusedInvoices] = useState<string[]>([]);

  const payments = useMemo(() => {
    const payments: Payment[] = [];

    invoices
      .filter((invoice) => !unusedInvoices.includes(invoice.voucherNumber))
      .forEach((invoice) => {
        const matchingContact = contactsWithBankAccounts.find(
          (contact) => contact.id === invoice.contactId
        );

        payments.push({ contact: matchingContact, invoice: invoice });
      });
    return payments;
  }, [contactsWithBankAccounts, invoices, unusedInvoices]);

  const paymentsWithContacts = useMemo(
    () =>
      payments.filter((payment) => {
        const matchingContact = payment.contact;

        if (!matchingContact) {
          // toast.error(
          //   `Die Rechnung <${payment.invoice.voucherNumber}> kann keinem Kontakt zugeordnet werden.`
          // );
          return false;
        }

        if (!hasValidBankDetails(matchingContact)) {
          // toast.error(
          //   `Für den Kontakt <${matchingContact.name}> kann keine Lastschrift erzeugt werden, da keine Bankverbindung gepflegt ist.`
          // );
          return false;
        }

        return true;
      }),
    [payments]
  );

  const executeTask = handleSubmit((data) => {
    setRunning(true);

    toast("SEPA-Lastschriften werden generiert ...");

    if (paymentsWithContacts.length === 0) {
      toast.error(
        `Es werden keine Zahlungen in der SEPA-Lastschrift verwendet.`
      );
      setRunning(false);
      return;
    }

    fetch("/api/generate-xml", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payments: paymentsWithContacts,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        setRunning(false);

        if (!json.success) {
          toast.error("SEPA-XML konnte nicht generiert werden.");
          return;
        }

        setSepaFile({
          id: json.id,
          xml: json.xml,
        });
      });
  });

  useEffect(() => {
    if (typeof window !== "object") {
      return;
    }
    fetchContacts();
    fetchInvoices();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-5 bg-gray-800 text-white py-2 px-4 inline-block my-8 select-none">
          Lexoffice - SEPA-Generator
        </h1>
        <div className="flex justify-end gap-3 mt-5">
          <Button
            variant="primary"
            onClick={saveSettings}
            disabled={isSaving || !isDirty || !isValid}
          >
            {isSaving ? <Spinner /> : "Einstellungen übernehmen"}
          </Button>
        </div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Lexoffice">
          <InputField
            {...register("lexoffice.apiKey")}
            label="API-Key"
            type="password"
          />
          <SelectField
            {...register("lexoffice.voucherStatus")}
            label="Status für eingelesene Rechnungen"
            options={statusOptions}
          />
          <h3 className="block mb-1">Zeitraum</h3>
          <Datepicker
            value={{
              startDate: new Date(getValues("lexoffice.dateRange")?.startDate),
              endDate: new Date(getValues("lexoffice.dateRange")?.endDate),
            }}
            onChange={({ startDate, endDate }) => {
              setValue(
                "lexoffice.dateRange.startDate",
                startDate.toISOString(),
                {
                  shouldDirty: true,
                }
              );
              setValue("lexoffice.dateRange.endDate", endDate.toISOString(), {
                shouldDirty: true,
              });
            }}
            showShortcuts={true}
          />
          <h3 className="text-lg font-medium my-3">Zahlungsempfänger</h3>
          <InputField
            {...register("creditor.name")}
            label="Name"
            maxLength={70}
          />
          <InputField
            {...register("creditor.iban", {
              required: {
                value: true,
                message: "Dieses Feld muss ausgefüllt werden.",
              },
              pattern: {
                value: IBAN_PATTERN,
                message: "Gib eine gültige IBAN an.",
              },
            })}
            label="IBAN"
          />
          {errors.creditor?.iban && (
            <FormError>{errors.creditor.iban.message}</FormError>
          )}
          <InputField
            {...register("creditor.bic", {
              required: {
                value: true,
                message: "Dieses Feld muss ausgefüllt werden.",
              },
              pattern: {
                value: /^[a-z]{6}[2-9a-z][0-9a-np-z]([a-z0-9]{3}|x{3})?$/i,
                message: "Gib eine gültige Bankleitzahl an.",
              },
            })}
            label="BIC"
          />
          {errors.creditor?.bic && (
            <FormError>{errors.creditor.bic.message}</FormError>
          )}
          <InputField
            {...register("creditor.identification", {
              required: {
                value: true,
                message: "Dieses Feld muss ausgefüllt werden.",
              },
              pattern: {
                value:
                  /(?=[a-zA-Z0-9]*[a-zA-Z])(?=[a-zA-Z0-9]*[0-9])[a-zA-Z0-9]{18}/,
                message: "Gib eine gültige Gläubiger-Identifikationsnummer an.",
              },
            })}
            label="Gläubiger-Identifikationsnummer"
          />
          {errors.creditor?.identification && (
            <FormError>{errors.creditor.identification.message}</FormError>
          )}
          <InputField
            {...register("creditor.reqdColltnDate", {
              required: {
                value: true,
                message: "Dieses Feld muss ausgefüllt werden.",
              },
              pattern: {
                value: DATE_PATTERN,
                message: "Gib das Datum im Format TT.MM.JJJJ ein.",
              },
            })}
            label="SEPA Fälligkeitsdatum"
            placeholder="TT.MM.JJJJ"
          />
          {errors.creditor?.reqdColltnDate && (
            <FormError>{errors.creditor.reqdColltnDate.message}</FormError>
          )}
        </Card>
        <Card title="SEPA-XML Vorschau">
          <div className="my-2">
            <CodeBlock
              customStyle={{
                height: "450px",
                overflow: "auto",
              }}
              text={sepaFile.xml || ""}
              showLineNumbers={true}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={executeTask}
              disabled={
                isSaving ||
                isDirty ||
                !isValid ||
                paymentsWithContacts.length === 0
              }
            >
              {isRunning ? (
                <Spinner />
              ) : (
                <>
                  SEPA XML-Datei erzeugen ({paymentsWithContacts.length})
                  <PlayIcon />
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                downloadFile(sepaFile.xml, {
                  filename: sepaFile.id,
                });
              }}
              disabled={isSaving || isDirty || !sepaFile.xml}
            >
              {isRunning ? (
                <Spinner />
              ) : (
                <>
                  XML-Datei herunterladen <DownloadIcon />
                </>
              )}
            </Button>
          </div>
        </Card>
        <Card title="Lexoffice Kontakte">
          <Contacts
            contacts={contactsWithBankAccounts}
            onUpdateContact={(contact) => {
              const accounts = getValues().accounts.filter(
                (account) => account.id !== contact.id
              );
              setValue("accounts", [...accounts, contact.bankAccount], {
                shouldDirty: true,
              });
            }}
          />
        </Card>
        <Card title="Lexoffice Rechnungen">
          <Invoices
            payments={payments}
            deleteInvoice={(invoice) => {
              setUnusedInvoices([...unusedInvoices, invoice.voucherNumber]);
              toast.error(
                `Die Rechnung <${invoice.voucherNumber}> wurde entfernt.`
              );
            }}
          >
            <div className="text-xs flex justify-between items-center my-2">
              Versteckte Rechnungen: {unusedInvoices.join(", ") || "-"}
              <MiniButton
                variant="secondary"
                type="button"
                onClick={(event) => {
                  setUnusedInvoices([]);
                }}
                disabled={unusedInvoices.length === 0}
                className="shrink-0"
              >
                Alle versteckten Rechnungen wieder anzeigen
              </MiniButton>
            </div>
          </Invoices>
        </Card>
      </form>
    </div>
  );
};
