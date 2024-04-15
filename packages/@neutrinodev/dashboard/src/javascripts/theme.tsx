import { BaseHelper, IRecord } from '@neutrinodev/core';
import { IWebsite } from '@neutrinodev/runtime';
import { ComponentChildren, createContext } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { DataAdapter } from './adapters/types.js';

export const WebsiteContext = createContext<{
  theme: IWebsite | null;
  records: Record<string, IRecord>;
  adapter: DataAdapter | null;
  loading: boolean | string;
  isLocal: boolean;
  setTheme:(theme: IWebsite) => void;
  setRecords: (records: Record<string, IRecord>) => void;
}>({
  theme: null,
  records: {},
  adapter: null,
  loading: true,
  isLocal: false,
  setTheme: () => null,
  setRecords: () => null,
});

export default function WebsiteData({ adapter, children }: { adapter: DataAdapter, children: ComponentChildren }) {

  const [ theme, setTheme ] = useState<IWebsite | null>(null);
  const [ records, setRecords ] = useState<Record<string, IRecord>>({});
  const [ loading, setLoading ] = useState<boolean | string>(true);
  const [ isLocal, setIsLocal ] = useState<boolean>(false);

  // Once we have an adapter initialized, fetch our site data.
  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!adapter) { return; }
      try {
        await adapter?.init();
        BaseHelper.registerFileHandler(adapter.saveFile.bind(adapter));
      }
      catch (err) {
        console.error(err);
        setLoading("Error Connecting to Database");
        return;
      }

      // Attempt to bind to a livereload port to get site template updates in dev mode.
      try {
        await new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:1777/livereload`);
          ws.onopen = async () => {
            setIsLocal(true);
            setTheme({ ...(await adapter.getTheme()) });
            resolve();
          };
          ws.onmessage = async (evt) => {
            const { command, data } = JSON.parse(evt.data) as { command: string; data: IWebsite; };
            console.log(`[WebSocket ${command}]`, data);
            switch (command) {
              case 'update': setTheme({ ...data });
            }
            resolve();
          };
          ws.onclose = () => { reject(); };
        });
      }
      catch {
        try {
          setTheme(await adapter.getTheme());
        }
        catch (err) {
          console.error(err);
          setLoading("Error Loading Site Theme");
          return;
        }
      }

      try {
        setRecords(await adapter.getAllRecords());
      }
      catch (err) {
        console.error(err);
        setLoading("Error Loading Site Content");
        return;
      }

      setLoading(false);
    })();
  }, [adapter]);

  return <WebsiteContext.Provider
    value={{
      theme,
      records,
      adapter,
      loading,
      isLocal,
      setTheme,
      setRecords,
    }}
  >
    {children}
  </WebsiteContext.Provider>;

}

