<?php

namespace Ernestdefoe\ThemeToggle\Content;

use Flarum\Frontend\Document;
use Flarum\Http\RequestUtil;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * No-flash pre-paint. Flarum core injects its own pre-paint script that sets
 * <html data-theme> from the FORUM-LEVEL color_scheme (per-user preference is
 * applied later by JS — core calls it "an acceptable tradeoff"). The result: a
 * member whose toggle choice differs from the forum default / OS paints with the
 * wrong scheme for a frame and then flips (the whole screen flashes white going
 * light→dark), most visibly on a full page load such as homepage → forum.
 *
 * This runs in $preHead AFTER core's script but still BEFORE first paint, and —
 * mirroring theme.ts resolveTheme()/hasStoredChoice() exactly — applies the
 * visitor's OWN stored choice (localStorage, with the owner-stamp check) ahead
 * of paint, so the correct scheme is on <html> from the first frame. When there
 * is no stored choice we leave core's value untouched (same as resolveTheme),
 * so this never introduces a flash of its own. JS-only state (localStorage) is
 * read client-side; the one thing we need from the server is the actor id for
 * the owner-stamp check, injected below.
 */
class PrePaintScheme
{
    public function __invoke(Document $document, Request $request): void
    {
        $actor = RequestUtil::getActor($request);
        $actorId = $actor->isGuest() ? 'null' : json_encode((string) $actor->id());

        $document->preHead[] = '<script>(function(){try{'
            . 'var V=["dark","dark-hc","light","light-hc","system"],'
            . 'C=localStorage.getItem("ernestdefoe-theme-toggle.choice"),'
            . 'O=localStorage.getItem("ernestdefoe-theme-toggle.owner-id"),'
            . 'A=' . $actorId . ';'
            // No valid stored choice → leave core's value (mirrors resolveTheme).
            . 'if(!C||V.indexOf(C)===-1)return;'
            // Owner-stamp gate: guests honour only unstamped picks; logged-in
            // users honour their own (or an as-yet-unstamped) pick.
            . 'if(A===null){if(O!==null)return;}else if(O!==null&&O!==A)return;'
            . 'var s=C;'
            . 'if(s==="system"){var m=window.matchMedia,'
            . 'd=m&&m("(prefers-color-scheme: dark)").matches,'
            . 'h=m&&m("(prefers-contrast: more)").matches;'
            . 's=(d?"dark":"light")+(h?"-hc":"");}'
            . 'document.documentElement.setAttribute("data-theme",s);'
            . '}catch(e){}})();</script>';
    }
}
