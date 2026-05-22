<?php

use App\Models\HmacUser;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('integration_api_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('model_id')->nullable();
            $table->string('model_type')->nullable();
        });

        DB::table('integration_api_logs')
            ->whereNotNull('user_id')
            ->update([
                'model_type' => User::class,
                'model_id' => DB::raw('user_id'),
            ]);

        DB::table('integration_api_logs')
            ->whereNull('user_id')
            ->update([
                'model_type' => HmacUser::class,
                'model_id' => 3,
            ]);

        Schema::table('integration_api_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }


    public function down(): void
    {
        Schema::table('integration_api_logs', function (Blueprint $table) {
            $table->dropColumn('model_id');
            $table->dropColumn('model_type');
        });
    }
};
