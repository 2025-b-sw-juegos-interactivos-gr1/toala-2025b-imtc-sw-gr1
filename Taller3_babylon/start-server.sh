#!/bin/bash
cd "$(dirname "$0")"
npx http-server -p 8080 -c-1
