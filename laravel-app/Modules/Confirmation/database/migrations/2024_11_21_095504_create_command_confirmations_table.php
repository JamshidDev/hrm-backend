<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Traits\ConfirmationColumn;

return new class extends Migration
{

    use ConfirmationColumn;

    public function up(): void
    {
        Schema::create('command_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('command_id')->nullable()->constrained('commands')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('command_confirmations');
    }

};
