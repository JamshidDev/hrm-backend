<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    use \Modules\Confirmation\Traits\ConfirmationColumn;

    public function up(): void
    {
        Schema::create('lms_protocol_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lms_protocol_id')
                ->nullable()
                ->constrained('lms_protocols')
                ->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('lms_protocol_confirmations');
    }
};
