<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('vacancy_approve_organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_organization_id')->constrained('organizations');
            $table->foreignId('to_organization_id')->constrained('organizations');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_approve_organizations');
    }
};
