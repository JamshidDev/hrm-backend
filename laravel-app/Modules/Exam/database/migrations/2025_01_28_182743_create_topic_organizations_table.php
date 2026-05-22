<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('topic_organizations', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->nullable()->constrained('topics')->cascadeOnDelete();
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('topic_organizations');
    }
};
