import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dyrt Facility Pro Forma",
  description: "Interactive financial model for Dyrt composting facility buildout",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        {children}
        <Script id="fullstory" strategy="afterInteractive">{`
window['_fs_debug'] = false;
window['_fs_host'] = 'fullstory.com';
window['_fs_script'] = 'edge.fullstory.com/s/fs.js';
window['_fs_org'] = 'o-24AX7J-na1';
window['_fs_namespace'] = 'FS';
(function(m,n,e,t,l,o,g,y){if(e in m){if(m.console&&m.console.log){m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].')}return}g=m[e]=function(a,b,s){g.q?g.q.push([a,b,s]):g._api(a,b,s)};g.q=[];o=n.createElement(t);o.async=1;o.crossOrigin='anonymous';o.src='https://'+_fs_script;y=n.getElementsByTagName(t)[0];y.parentNode.insertBefore(o,y);g.identify=function(i,v,s){g(l,{uid:i},s);if(v)g(l,v,s)};g.setUserVars=function(v,s){g(l,v,s)};g.event=function(i,v,s){g('event',{n:i,p:v},s)};g.anonymize=function(){g.identify(!1)};g.shutdown=function(){g("rec",!1)};g.restart=function(){g("rec",!0)};g.log=function(a,b){g("log",[a,b])};g.consent=function(a){g("consent",!(!a))};g.identifyAccount=function(i,v){o='account';v=v||{};v.acctId=i;g(o,v)};g.clearUserCookie=function(){}})(window,document,window['_fs_namespace'],'script','user');
        `}</Script>
      </body>
    </html>
  );
}
