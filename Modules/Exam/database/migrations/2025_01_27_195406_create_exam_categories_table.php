<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('exam_categories', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')
                ->nullable()->constrained('organizations')
                ->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_categories');
    }
};
