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
        Schema::create('worker_application_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_application_id')->nullable()->constrained('worker_applications')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_application_confirmations');
    }
};
