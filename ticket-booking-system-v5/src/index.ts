import { ENV } from "./config/env";
import { app } from "./app";

app.listen(ENV.PORT, () => {
    console.log(
        `ticket booking system running at http://localhost:${ENV.PORT}`
    )
    console.log(
        `Openapi Specs at http://localhost:${ENV.PORT}/api/v5/openapi`
    )
})

export type App = typeof app;