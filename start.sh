#!/bin/bash

cd "/home/jean-louis/Bureau/VPIJLR-APP"

node serveurLicences.js &

sleep 1

xdg-open index.html
