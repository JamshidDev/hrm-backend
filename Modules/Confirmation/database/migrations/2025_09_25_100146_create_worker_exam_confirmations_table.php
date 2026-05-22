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
        Schema::create('worker_exam_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_exam_id')->nullable()->constrained('worker_exams')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_exam_confirmations');
    }
};
