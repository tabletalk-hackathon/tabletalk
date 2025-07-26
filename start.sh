#!/bin/bash

# Force the application to use port 3000
export PORT=3000

# Start the Next.js application
exec node server.js
