# gnome-better-window-placement
gnome-shell extension to place new windows better

By default the first window on each workspace is placed in the top-left
corner but with a padding. This method is described in the mutter source code:

> The point here is to tile a window such that "extra"
> space is equal on either side (i.e. so a full screen
> of windows tiled this way would center the windows
> as a group)

This extension removes this padding or extra space.

## Install
* Run install.sh to install extension in `~/.local/share/gnome-shell/extensions`
* Enable extension in gnome-tweak-tool
