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
        Schema::create('lms_certificate_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lms_certificate_id')
                ->nullable()
                ->constrained('lms_certificates')
                ->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('lms_certificate_confirmations');
    }
};
