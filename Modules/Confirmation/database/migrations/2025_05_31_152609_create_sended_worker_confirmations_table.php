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
        Schema::create('sended_worker_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sended_worker_id')->nullable()->constrained('sended_workers')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sended_worker_confirmations');
    }
};
