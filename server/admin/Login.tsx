import { useCallback, useState } from "react";
import { Button } from "./components/Button";
import { InputField } from "./components/InputField";
import { Spinner } from "./components/Spinner";
import { Card } from "./components/Card";
import { toast } from "sonner";
import { sha256 } from "js-sha256";

export const Login = () => {
  const [isRunning, setRunning] = useState(false);

  const performLogin = useCallback(
    async (event) => {
      console.log("Performing login ...");
      setRunning(true);

      const form = event.target;

      const response = fetch("/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: form.elements.username.value,
          password: sha256(form.elements.password.value),
        }),
      });

      response
        .then((res) => res.json())
        .then((response) => {
          console.log("server returned", response);

          setRunning(false);

          if (!response.success) {
            toast.error("Anmeldung konnte nicht durchgeführt werden.");
            return;
          }

          window.location.reload();
        });

      event.preventDefault();
    },
    [setRunning]
  );

  return (
    <div className="max-w-[800px] mx-auto p-5 py-[20vh]">
      <h1 className="text-2xl font-bold mb-5 bg-gray-800 text-white py-2 px-4 inline-block my-8 select-none">
        Lexoffice - SEPA-Generator
      </h1>
      <form onSubmit={performLogin}>
        <Card title="Login">
          <InputField
            id="username"
            label="Benutzername"
            type="text"
            autoComplete="username"
            required
          />
          <InputField
            id="password"
            label="Kennwort"
            type="password"
            autoComplete="current-password"
            required
          />
          <Button variant="secondary" disabled={isRunning}>
            {isRunning ? <Spinner /> : "Login"}
          </Button>
        </Card>
      </form>
    </div>
  );
};
