import "dotenv/config"

import { app } from "./app"

app.listen(3000)

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`)


// The separation is:
// - app.ts defines the application.
// - index.ts starts the network server.
// That will also let us test the application later without opening a listening port.