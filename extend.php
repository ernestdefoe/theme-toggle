<?php

use Flarum\Extend;
use Flarum\Frontend\Document;
use Flarum\Http\RequestUtil;
use Psr\Http\Message\ServerRequestInterface;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less')
        // Server-side pre-paint (no-flash). Flarum core's own pre-paint script
        // sets <html data-theme> from the FORUM-LEVEL color_scheme and applies the
        // per-user preference via JS after boot — so a member whose toggle choice
        // differs from the forum default / OS paints the wrong scheme for a frame
        // then flips (whole screen flashes, most visibly on a full load such as
        // homepage → forum). This runs in $preHead AFTER core's script but before
        // first paint and applies the visitor's OWN stored choice up front,
        // mirroring theme.ts resolveTheme()/hasStoredChoice() exactly (localStorage
        // choice + owner-stamp gate; system → matchMedia). When there's no stored
        // choice it leaves core's value alone, so it never adds a flash of its own.
        //
        // Kept as an inline closure on purpose: this extension ships no other PHP,
        // and a dedicated class would add a new PSR-4 namespace that breaks the
        // forum (class-not-found) until the composer autoloader is regenerated —
        // a closure needs no autoload and works the moment the file updates.
        ->content(function (Document $document, ServerRequestInterface $request): void {
            $actor = RequestUtil::getActor($request);
            $actorId = $actor->isGuest() ? 'null' : json_encode((string) $actor->id());

            $document->preHead[] = '<script>(function(){try{'
                . 'var V=["dark","dark-hc","light","light-hc","system"],'
                . 'C=localStorage.getItem("ernestdefoe-theme-toggle.choice"),'
                . 'O=localStorage.getItem("ernestdefoe-theme-toggle.owner-id"),'
                . 'A=' . $actorId . ';'
                . 'if(!C||V.indexOf(C)===-1)return;'
                . 'if(A===null){if(O!==null)return;}else if(O!==null&&O!==A)return;'
                . 'var s=C;'
                . 'if(s==="system"){var m=window.matchMedia,'
                . 'd=m&&m("(prefers-color-scheme: dark)").matches,'
                . 'h=m&&m("(prefers-contrast: more)").matches;'
                . 's=(d?"dark":"light")+(h?"-hc":"");}'
                . 'document.documentElement.setAttribute("data-theme",s);'
                . '}catch(e){}})();</script>';
        }),

    new Extend\Locales(__DIR__.'/locale'),
];
