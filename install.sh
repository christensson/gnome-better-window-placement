#!/bin/bash

localExtDir=$HOME/.local/share/gnome-shell/extensions
uuid=$(cat metadata.json|grep uuid|cut -d'"' -f4)
targetDir=${localExtDir}/${uuid}
echo "Now installing in ${targetDir}"
mkdir -p ${targetDir}
cp * ${targetDir}
