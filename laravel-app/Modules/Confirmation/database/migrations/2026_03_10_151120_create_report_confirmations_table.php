<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    use \Modules\Confirmation\Traits\ConfirmationColumn;

    public function up(): void
    {
        Schema::create('report_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->nullable()->constrained('reports')->cascadeOnDelete();
            $this->getTableColumns($table);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('report_confirmations');
    }
};
