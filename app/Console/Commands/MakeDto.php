<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MakeDto extends Command
{
    protected $signature = 'make:dto {name}';
    protected $description = 'Create a DTO class';

    public function handle(): void
    {
        $name = $this->argument('name');
        $path = app_path("DTO/{$name}.php");

        if (file_exists($path)) {
            $this->error('DTO already exists');
            return;
        }

        file_put_contents($path, <<<PHP
<?php

namespace App\DTO;

final readonly class {$name}
{
    public function __construct()
    {
    }
}
PHP);

        $this->info("DTO {$name} created");
    }
}
