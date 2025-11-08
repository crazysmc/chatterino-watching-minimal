# Chatterino Watching Minimal

Browser extension with minimal permissions to update the `/watching` split on
Chatterino.

Unlike the
[offical extension](https://github.com/Chatterino/chatterino-browser-ext),
this extension does not implement any OS-specific chat replace feature, nor
does it request the browser permission to read all tabs' URLs.
Only URLs of `www.twitch.tv` tabs are visible to the extension.

In order to allow this extension to communicate with the Chatterino app, add
the extension ID `@chatterino-watching-minimal.crazysmc` in the browser
integration settings.

The last selected Twitch stream is sent as a `select` message and the set of
all open Twitch streams is sent as a `sync` message.
Popout chat windows as well as Mod View pages are counted as watching a
stream.
