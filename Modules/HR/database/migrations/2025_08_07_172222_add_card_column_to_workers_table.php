<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('workers', static function (Blueprint $table) {
            $table->integer('card')
                ->after('pin')
                ->nullable()
                ->unique()
                ->index('worker_card_index');
        });

       \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach (\Modules\HR\Models\Worker::get() as $item) {
                $item->card = 1000000 + $item->id;
                $item->save();
            }
            DB::commit();
        } catch (Exception $e){
            DB::rollBack();
            Log::error($e->getMessage());
        }
    }


    public function down(): void
    {
        Schema::table('workers', static function (Blueprint $table) {
            $table->dropIndex('worker_card_index');
            $table->dropColumn('card');
        });
    }
};
