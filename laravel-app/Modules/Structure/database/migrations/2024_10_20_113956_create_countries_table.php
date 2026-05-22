<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Structure\Traits\AddressColumn;

return new class extends Migration {

    use AddressColumn;
    
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $this->getTableColumns($table);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('countries');
    }
};
