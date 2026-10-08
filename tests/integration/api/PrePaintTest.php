<?php

namespace ErnestDefoe\ThemeToggle\Tests\integration\api;

use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

/**
 * The no-flash script written into every forum page's head: it applies the
 * visitor's own stored choice before the first paint.
 */
class PrePaintTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-theme-toggle');

        $this->prepareDatabase([User::class => [$this->normalUser()]]);
    }

    private function page(?int $actor = null): string
    {
        return (string) $this->send($this->request('GET', '/', $actor ? ['authenticatedAs' => $actor] : []))->getBody();
    }

    private function script(string $html): string
    {
        $this->assertSame(1, preg_match('#<script>\(function\(\)\{try\{var V=.*?</script>#s', $html, $m), 'The pre-paint script is in the page');

        return $m[0];
    }

    #[Test]
    public function the_script_runs_before_the_bundle_and_reads_the_stored_choice()
    {
        $html = $this->page();
        $script = $this->script($html);

        $this->assertStringContainsString('localStorage.getItem("ernestdefoe-theme-toggle.choice")', $script);
        $this->assertStringContainsString('document.documentElement.setAttribute("data-theme",s)', $script);
        $bundle = strpos($html, '/assets/forum');
        $this->assertNotFalse($bundle);
        $this->assertLessThan($bundle, strpos($html, $script), 'Before the forum bundle loads');
    }

    #[Test]
    public function a_guest_only_takes_a_choice_no_member_stamped()
    {
        $this->assertStringContainsString('A=null;', $this->script($this->page()));
    }

    #[Test]
    public function a_member_only_takes_their_own_choice()
    {
        $this->assertStringContainsString('A="2";', $this->script($this->page(2)), 'The id is a JSON string, as the owner stamp is');
    }
}
