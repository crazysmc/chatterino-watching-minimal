'use strict';

globalThis.browser ??= chrome;

const manifest = browser.runtime.getManifest ();
const appName = 'com.chatterino.chatterino';

function sendMessage (msg)
{
  if (!sendMessage.port)
  {
    console.debug ('CONN', appName);
    sendMessage.port = browser.runtime.connectNative (appName);
    sendMessage.port.onDisconnect.addListener (disconnected);
    sendMessage.port.onMessage.addListener (logReceived);
  }
  console.log ('SEND', msg);
  sendMessage.port.postMessage (msg);
}

function disconnected (port)
{
  sendMessage.port = null;
  const err = port.error ?? browser.runtime.lastError;
  if (err)
    console.warn ('END', err);
  else
    console.debug ('END');
}

function logReceived (data)
{
  console.debug ('RECV', data);
}

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
      if (path[2] == 'moderator')
        return path[3];
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
    case 'search':
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

function activeTwitchTab (url, force = false)
{
  if (!url)
    return;
  const login = getLoginFromUrl (url);
  if (!login || !force && activeTwitchTab.login == login)
    return;
  activeTwitchTab.login = login;
  sendMessage ({
    action: 'select',
    type: 'twitch',
    name: login,
    winId: 'm',
  });
}

async function syncTwitchTabs (rmId, removeInfo, force = false)
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
  if (!force &&
      syncTwitchTabs.set.size == set.size &&
      syncTwitchTabs.set.isSubsetOf (set))
    return;
  syncTwitchTabs.set = set;
  sendMessage ({
    action: 'sync',
    twitchChannels: [ ...set.values () ],
  });
}

syncTwitchTabs.set = new Set ();

function refreshState (tab)
{
  activeTwitchTab (tab.url, true);
  syncTwitchTabs (null, null, true);
}

browser.action.onClicked.addListener (refreshState);

browser.runtime.onInstalled.addListener (syncTwitchTabs);
browser.runtime.onStartup.addListener (syncTwitchTabs);

function changedTab (tabId, changeInfo, tab)
{
  if (tab.active && changeInfo.url)
    activeTwitchTab (changeInfo.url);
  syncTwitchTabs ();
}

browser.tabs.onUpdated.addListener (changedTab);

async function activeTab (activeInfo)
{
  const tab = await browser.tabs.get (activeInfo.tabId);
  if (tab.url)
    activeTwitchTab (tab.url);
}

browser.tabs.onActivated.addListener (activeTab);
browser.tabs.onRemoved.addListener (syncTwitchTabs);

async function changedWindow (windowId)
{
  if (windowId == browser.windows.WINDOW_ID_NONE)
    return;
  const [ tab ] = await browser.tabs.query ({ windowId, active: true });
  if (tab.url)
    activeTwitchTab (tab.url);
}

browser.windows.onFocusChanged.addListener (changedWindow);
