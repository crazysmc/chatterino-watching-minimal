'use strict';

globalThis.browser ??= chrome;

const manifest = browser.runtime.getManifest ();
const appName = 'com.chatterino.chatterino';

function sendMessage (msg)
{
  console.debug (msg);
  if (!sendMessage.port)
  {
    sendMessage.port = browser.runtime.connectNative (appName);
    sendMessage.port.onDisconnect.addListener (sendMessage.disconnect);
  }
  sendMessage.port.postMessage (msg);
}

sendMessage.disconnect = () => { sendMessage.port = null; };

function getLoginFromUrl (url)
{
  const { pathname } = new URL (url);
  const path = pathname.split ('/');
  if (path.length < 2)
    return;
  switch (path[1])
  {
    case 'moderator':
    case 'popout':
      return path[2];

    case '_deck': // ffz extension
    case 'directory':
    case 'downloads':
    case 'drops':
    case 'inventory':
    case 'jobs':
    case 'messages':
    case 'p':
    case 'payments':
    case 'prime':
    case 'privacy':
    case 'settings':
    case 'store':
    case 'subscriptions':
    case 'turbo':
    case 'videos':
    case 'wallet':
      return;
  }
  if (path.length > 2)
    return;
  return path[1];
}

function activeTwitchTab (url)
{
  const login = getLoginFromUrl (url);
  if (!login || activeTwitchTab.login == login)
    return;
  activeTwitchTab.login = login;
  sendMessage ({
    action: 'select',
    type: 'twitch',
    name: login,
  });
}

async function syncTabs (rmId)
{
  const tabs = await browser.tabs.query ({ url: manifest.host_permissions });
  const set = new Set ();
  for (const tab of tabs)
    if (tab.id != rmId)
    {
      const login = getLoginFromUrl (tab.url);
      if (login)
        set.add (login);
    }
  if (syncTabs.set.size == set.size && syncTabs.set.isSubsetOf (set))
    return;
  syncTabs.set = set;
  sendMessage ({
    action: 'sync',
    twitchChannels: [ ...set.values () ],
  });
}

syncTabs.set = new Set ();

browser.runtime.onInstalled.addListener (syncTabs);
browser.runtime.onStartup.addListener (syncTabs);

function changedUrl (tabId, changeInfo, tab)
{
  if (tab.active)
    activeTwitchTab (changeInfo.url);
}

browser.tabs.onUpdated.addListener (changedUrl, { properties: [ 'url' ] });

function changedTab (tabId)
{
  syncTabs ();
}

browser.tabs.onUpdated.addListener (changedTab);

async function activeTab (activeInfo)
{
  const tab = await browser.tabs.get (activeInfo.tabId);
  if (tab.url)
    activeTwitchTab (tab.url);
}

browser.tabs.onActivated.addListener (activeTab);
browser.tabs.onRemoved.addListener (syncTabs);

async function changedWindow (windowId)
{
  if (windowId == browser.windows.WINDOW_ID_NONE)
    return;
  const [ tab ] = await browser.tabs.query ({ windowId, active: true });
  if (tab.url)
    activeTwitchTab (tab.url);
}

browser.windows.onFocusChanged.addListener (changedWindow);
