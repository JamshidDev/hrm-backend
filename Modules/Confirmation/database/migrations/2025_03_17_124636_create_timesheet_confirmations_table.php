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
        Schema::create('timesheet_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_sheet_id')->nullable()->constrained('time_sheets')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timesheet_confirmations');
    }
};
