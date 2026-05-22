<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    use \Modules\Confirmation\Traits\ConfirmationColumn;
    public function up(): void
    {
        Schema::create('staffing_approve_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staffing_approve_id')
                ->nullable()
                ->constrained('staffing_approves')
                ->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('staffing_approve_confirmations');
    }
};
