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
        Schema::create('contract_additional_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_additional_id')->nullable()->constrained('contract_additional')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_additional_confirmations');
    }
};
